import React from 'react';
import { useApp } from '../context/AppContext';
import './Notification.css';

const Notification: React.FC = () => {
  const { notification } = useApp();

  if (!notification) {
    return null;
  }

  return (
    <div className={`notification notification-${notification.type}`}>
      <div className="notification-content">
        <span className="notification-icon">
          {notification.type === 'success' && '✅'}
          {notification.type === 'error' && '❌'}
          {notification.type === 'info' && 'ℹ️'}
        </span>
        <p className="notification-message">{notification.message}</p>
      </div>
    </div>
  );
};

export default Notification;
