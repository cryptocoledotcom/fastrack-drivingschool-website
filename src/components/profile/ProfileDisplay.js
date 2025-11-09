import React from 'react';
import formatPhoneNumber from '../../utils/formatPhoneNumber';

const ProfileDisplay = ({ profile, email, onEdit }) => {
  return (
    <>
      <p>
        <strong>Name:</strong> {profile?.firstName || ''} {profile?.middleName || ''} {profile?.lastName || ''}
      </p>
      <p><strong>Birthday:</strong> {profile?.birthday || '-'}</p>
      <p><strong>Email:</strong> {email}</p>
      <p>
        <strong>Address:</strong>{' '}
        {profile?.address ? (
          <>
            {profile.address.houseNumber || ''} {profile.address.street || ''},<br />
            {profile.address.town || ''}, {profile.address.state || ''} {profile.address.zip || ''}
          </>
        ) : '-'}
      </p>
      <p><strong>Phone:</strong> {formatPhoneNumber(profile?.phone) || '-'}</p>
      <button onClick={onEdit} className="btn btn-secondary" style={{ marginRight: '1rem' }}>Edit</button>
    </>
  );
};

export default ProfileDisplay;