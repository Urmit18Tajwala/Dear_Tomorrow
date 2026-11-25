self.addEventListener("notificationclick", event => {
  event.notification.close();
  const siteRoot = self.registration.scope;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(siteRoot) && "focus" in client) {
        return client.focus();
      }
    }
    return self.clients.openWindow(siteRoot);
  })());
});
