import { renderHook, waitFor } from '@testing-library/react';
import { useCourseData } from './useCourseData';
import { getDoc, getDocs } from 'firebase/firestore';

// Mock the entire firebase/firestore module
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'), // Import and retain default exports
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn((db, path, id) => ({ path: `${path}/` })), // Mock doc to return a simple object
  collection: jest.fn((db, path) => ({ path })),
  query: jest.fn((collection) => ({ collection })),
  where: jest.fn(),
}));

describe('useCourseData', () => {
  const mockCourseId = 'course-101';

  // Mock Data
  const mockCourse = {
    id: mockCourseId,
    title: 'Test Course',
    moduleOrder: ['module-2', 'module-1'], // Intentionally out of order to test sorting
  };

  const mockModules = [
    { id: 'module-1', title: 'Module 1', courseId: mockCourseId },
    { id: 'module-2', title: 'Module 2', courseId: mockCourseId },
  ];

  const mockLessons = {
    'lesson-a': { id: 'lesson-a', title: 'Lesson A', courseId: mockCourseId },
    'lesson-b': { id: 'lesson-b', title: 'Lesson B', courseId: mockCourseId },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch, process, and sort course data successfully', async () => {
    // Arrange: Configure the mocks to return our data
    getDoc.mockResolvedValue({
      exists: () => true,
      id: mockCourseId,
      data: () => ({ title: 'Test Course', moduleOrder: ['module-2', 'module-1'] }),
    });

    getDocs
      .mockResolvedValueOnce({ // First call for modules
        docs: mockModules.map(m => ({ id: m.id, data: () => m })),
      })
      .mockResolvedValueOnce({ // Second call for lessons
        docs: Object.values(mockLessons).map(l => ({ id: l.id, data: () => l })),
      });

    // Act
    const { result } = renderHook(() => useCourseData(mockCourseId));

    // Assert
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Check that the final state is correct
    expect(result.current.course).toEqual(mockCourse);
    expect(result.current.lessons).toEqual(mockLessons);

    // IMPORTANT: Check that modules were sorted correctly based on moduleOrder
    expect(result.current.modules.map(m => m.id)).toEqual(['module-2', 'module-1']);
    
    expect(result.current.error).toBe('');
  });

  it('should set an error state if the course document is not found', async () => {
    // Arrange: Configure getDoc to return a non-existent document
    getDoc.mockResolvedValue({
      exists: () => false,
    });

    // Suppress the expected console.error from the hook's catch block
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Act
    const { result } = renderHook(() => useCourseData(mockCourseId));

    // Assert
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Check that the error state is set correctly
    expect(result.current.error).toBe("Failed to load course content.");
    expect(result.current.course).toBeNull();
    expect(result.current.modules).toEqual([]);
    expect(result.current.lessons).toEqual({});

    // Clean up the spy
    consoleErrorSpy.mockRestore();
  });

  it('should set an error state if fetching modules fails', async () => {
    // Arrange: First, the course document fetch is successful.
    getDoc.mockResolvedValue({
      exists: () => true,
      id: mockCourseId,
      data: () => ({ title: 'Test Course', moduleOrder: ['module-2', 'module-1'] }),
    });

    // Arrange: Then, the modules fetch fails.
    const errorMessage = 'Permission denied on modules collection';
    getDocs.mockRejectedValue(new Error(errorMessage));

    // Suppress the expected console.error from the hook's catch block
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Act
    const { result } = renderHook(() => useCourseData(mockCourseId));

    // Assert
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Failed to load course content.");
    expect(result.current.modules).toEqual([]); // Modules should be empty
    expect(result.current.lessons).toEqual({}); // Lessons should be empty

    consoleErrorSpy.mockRestore();
  });
});
