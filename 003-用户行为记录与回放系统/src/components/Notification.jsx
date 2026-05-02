import useAppStore from '../store/appStore'

function Notification() {
  const { notifications } = useAppStore()

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <div 
          key={notification.id} 
          className={`notification ${notification.type}`}
        >
          {notification.message}
        </div>
      ))}
    </div>
  )
}

export default Notification
