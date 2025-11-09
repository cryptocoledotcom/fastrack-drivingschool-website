import React from 'react';

const ProfileEditForm = ({ form, onFormChange, onSave, onCancel }) => {
  return (
    <form className="auth-form" onSubmit={onSave} style={{ marginBottom: "1rem" }}>
      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="firstName" style={{ display: "block", marginBottom: "0.25rem" }}>First Name:</label>
        <input type="text" id="firstName" name="firstName" value={form.firstName} onChange={onFormChange} required autoComplete="given-name" />
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="middleName" style={{ display: "block", marginBottom: "0.25rem" }}>Middle Name:</label>
        <input type="text" id="middleName" name="middleName" value={form.middleName} onChange={onFormChange} autoComplete="additional-name" />
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="lastName" style={{ display: "block", marginBottom: "0.25rem" }}>Last Name:</label>
        <input type="text" id="lastName" name="lastName" value={form.lastName} onChange={onFormChange} required autoComplete="family-name" />
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="birthday" style={{ display: "block", marginBottom: "0.25rem" }}>Birthday:</label>
        <input type="date" id="birthday" name="birthday" value={form.birthday} onChange={onFormChange} required autoComplete="bday" />
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.25rem" }}>Address:</label>
        <label htmlFor="houseNumber" className="sr-only">House Number</label>
        <input type="text" id="houseNumber" name="houseNumber" placeholder="House Number" value={form.houseNumber} onChange={onFormChange} required style={{ width: "30%", marginRight: "1%" }} autoComplete="address-line1" />
        <label htmlFor="street" className="sr-only">Street</label>
        <input type="text" id="street" name="street" placeholder="Street" value={form.street} onChange={onFormChange} required style={{ width: "68%" }} autoComplete="address-line2" />
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="town" className="sr-only">Town</label>
        <input type="text" id="town" name="town" placeholder="Town" value={form.town} onChange={onFormChange} required style={{ width: "40%", marginRight: "4%" }} autoComplete="address-level2" />
        <label htmlFor="state" className="sr-only">State</label>
        <input type="text" id="state" name="state" placeholder="State" value={form.state} onChange={onFormChange} required style={{ width: "20%", marginRight: "4%" }} autoComplete="address-level1" />
        <label htmlFor="zip" className="sr-only">Zip</label>
        <input type="text" id="zip" name="zip" placeholder="Zip" value={form.zip} onChange={onFormChange} required style={{ width: "30%" }} autoComplete="postal-code" />
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="phone" style={{ display: "block", marginBottom: "0.25rem" }}>Phone:</label>
        <input type="tel" id="phone" name="phone" value={form.phone} onChange={onFormChange} required autoComplete="tel" />
      </div>
      <button type="submit" className="btn btn-secondary" style={{ marginRight: "1rem" }}>Save</button>
      <button type="button" onClick={onCancel} className="btn">Cancel</button>
    </form>
  );
};

export default ProfileEditForm;