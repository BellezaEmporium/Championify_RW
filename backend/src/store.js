class MemoryStore {
  constructor() {
    this.data = new Map();
  }
  get(key) {
    return this.data.get(key);
  }
  set(key, val) {
    this.data.set(key, val);
    return this;
  }
  push(key, val) {
    const arr = this.get(key) || [];
    arr.push(val);
    this.set(key, arr);
  }
}
const store = new MemoryStore();
export default store;
