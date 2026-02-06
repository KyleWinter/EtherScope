type MonitorItem = { address: string; enabled: boolean; updatedAt: string };

const store = new Map<string, MonitorItem>();

export const monitorService = {
  subscribe(address: string) {
    const key = address.toLowerCase();
    store.set(key, { address: key, enabled: true, updatedAt: new Date().toISOString() });
    return key;
  },

  unsubscribe(address: string) {
    const key = address.toLowerCase();
    const prev = store.get(key);
    if (prev) store.set(key, { ...prev, enabled: false, updatedAt: new Date().toISOString() });
  },

  list() {
    return Array.from(store.values());
  },

  tick() {
    // placeholder: future implement chain polling and push alerts
  }
};
