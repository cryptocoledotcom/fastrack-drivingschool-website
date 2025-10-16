import React, { createContext, useState, useContext } from 'react';
import Notification from './Notification';

const NotificationContext = createContext();

export const useNotification = () => {
  return useContext(NotificationContext);
};

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {notification && <Notification message={notification.message} type={notification.type} />}
      {children}
    </NotificationContext.Provider>
  );
};
