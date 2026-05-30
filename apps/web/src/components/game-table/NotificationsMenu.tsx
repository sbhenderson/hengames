export type GameNotification = {
  id: number;
  seq: number;
  message: string;
  at: string;
};

export function NotificationsMenu(props: { notifications: GameNotification[] }) {
  const count = props.notifications.length;
  return (
    <details className="notifications-menu">
      <summary className="notifications-summary" aria-label={`Notifications (${count})`}>
        <span aria-hidden="true">🔔</span>
        <span className="notifications-count">{count}</span>
      </summary>
      <div className="notifications-panel" aria-label="Notification history">
        {count ? (
          <ul className="notifications-list">
            {props.notifications
              .slice()
              .reverse()
              .map((notification) => (
                <li key={notification.id}>
                  <span className="notifications-time">
                    {new Date(notification.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span>{notification.message}</span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="helper-text">No notifications yet.</p>
        )}
      </div>
    </details>
  );
}
