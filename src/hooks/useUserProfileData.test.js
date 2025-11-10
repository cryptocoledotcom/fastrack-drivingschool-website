import { renderHook, waitFor, act } from '@testing-library/react';
import { useUserProfileData } from './useUserProfileData';
import { getDoc } from 'firebase/firestore';

// Mock the service dependency to prevent interference from other test files
jest.mock('../services/userProgressFirestoreService');

// Mock Firebase Firestore functions to be robust and isolated
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  // This mock needs to be robust enough to handle different path structures.
  // It now correctly joins all path segments to create a full path.
  doc: jest.fn((db, path, ...pathSegments) => {
    const fullPath = [path, ...pathSegments].join('/');
    return { path: fullPath, id: pathSegments[pathSegments.length - 1] || path };
  }),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
}));

// Mock the Firebase db object
jest.mock('../Firebase', () => ({
  db: {},
}));

describe('useUserProfileData', () => {
  const mockUser = { uid: 'test-user-123', email: 'test@example.com' };
  const mockProfileData = { firstName: 'John', lastName: 'Doe', phone: '123-456-7890' };
  const mockSecurityQuestions = [
    { question: 'Pet name?', answerHash: 'hashed_answer_1' },
    { question: 'Car model?', answerHash: 'hashed_answer_2' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock: simulate that no documents exist for a clean slate.
    getDoc.mockResolvedValue({ exists: () => false, data: () => undefined });
  });

  it('should return loading true initially, then false with data', async () => {
    // Mock the resolved values for the parallel fetches
    getDoc
      .mockImplementationOnce(() => Promise.resolve({ exists: () => true, data: () => mockProfileData })) // First call for profile
      .mockImplementationOnce(() => Promise.resolve({ exists: () => true, data: () => ({ questions: mockSecurityQuestions }) })); // Second call for security


    const { result } = renderHook(() => useUserProfileData(mockUser));

    // The hook's useEffect will call fetchProfileData. We wait for loading to be false.
    await waitFor(() => expect(result.current.loading).toBe(false));
    
    // Now that loading is false, we can assert the data.
    expect(result.current.profile).toEqual(mockProfileData);
    expect(result.current.securityQuestions).toEqual(mockSecurityQuestions);
    expect(result.current.error).toBe('');
  });

  it('should return null profile and empty security questions if user is null', async () => {
    const { result } = renderHook(() => useUserProfileData(null));
    expect(result.current.profile).toBeNull();
    expect(result.current.securityQuestions).toEqual([]);
    expect(result.current.error).toBe('');
  });

  it('should return null profile and empty security questions if profile does not exist', async () => {
    const { result } = renderHook(() => useUserProfileData(mockUser));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toBeNull();
    expect(result.current.securityQuestions).toEqual([]);
    expect(result.current.error).toBe('');
  });

  it('should return profile data and empty security questions if security profile does not exist', async () => {
    getDoc
      .mockImplementationOnce(() => Promise.resolve({ exists: () => true, data: () => mockProfileData }))
      .mockImplementationOnce(() => Promise.resolve({ exists: () => false, data: () => undefined }));
    
    const { result } = renderHook(() => useUserProfileData(mockUser));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toEqual(mockProfileData);
    expect(result.current.securityQuestions).toEqual([]);
    expect(result.current.error).toBe('');
  });

  it('should handle malformed security questions data gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    getDoc
      .mockImplementationOnce(() => Promise.resolve({ exists: () => true, data: () => mockProfileData }))
      .mockImplementationOnce(() => Promise.resolve({ exists: () => true, data: () => ({ questions: "not an array" }) }));
    
    const { result } = renderHook(() => useUserProfileData(mockUser));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toEqual(mockProfileData);
    expect(result.current.securityQuestions).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Firestore 'questions' field is not an array for user:",
      mockUser.uid,
      "not an array"
    );
    consoleErrorSpy.mockRestore();
  });

  it('should set error state if fetching profile data fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const errorMessage = 'Firestore connection error';
    getDoc.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useUserProfileData(mockUser));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toBeNull();
    expect(result.current.securityQuestions).toEqual([]);
    expect(result.current.error).toContain(errorMessage);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    consoleErrorSpy.mockRestore();
  });

  it('should refetch data when fetchProfileData is called', async () => {
    const initialProfileData = { firstName: 'Initial', lastName: 'User' };
    const updatedProfileData = { firstName: 'Updated', lastName: 'User' };
    const initialSecurityQuestions = [{ question: 'Q1', answerHash: 'A1' }];
    const updatedSecurityQuestions = [{ question: 'Q1', answerHash: 'A1' }, { question: 'Q2', answerHash: 'A2' }];

    // Mock initial fetch
    getDoc
      .mockImplementationOnce(() => Promise.resolve({ exists: () => true, data: () => initialProfileData }))
      .mockImplementationOnce(() => Promise.resolve({ exists: () => true, data: () => ({ questions: initialSecurityQuestions }) }));

    const { result } = renderHook(() => useUserProfileData(mockUser));

    await waitFor(() => expect(result.current.profile).toEqual(initialProfileData));

    // Set up mocks for the refetch
    getDoc
      .mockImplementationOnce(() => Promise.resolve({ exists: () => true, data: () => updatedProfileData }))
      .mockImplementationOnce(() => Promise.resolve({ exists: () => true, data: () => ({ questions: updatedSecurityQuestions }) }));

    act(() => { // Manually trigger the refetch inside act
      result.current.fetchProfileData(); // This is synchronous, but it triggers async work.
    });

    await waitFor(() => { expect(result.current.profile).toEqual(updatedProfileData) });
    expect(result.current.securityQuestions).toEqual(updatedSecurityQuestions);
  });
});
