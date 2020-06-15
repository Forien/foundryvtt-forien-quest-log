export default class Task {
  constructor(data = {}) {
    this._name = data.name || null;
    this._completed = data.completed || false;
    this._hidden = data.hidden || false;
  }

  toggle() {
    this._completed = !this._completed;
  }

  get name() {
    return this._name;
  }

  set name(name) {
    this._name = name;
  }

  get completed() {
    return this._completed;
  }

  set completed(completed) {
    this._completed = (completed === true);
  }

  get hidden() {
    return this._hidden;
  }

  set hidden(hidden) {
    this._hidden = (hidden === true);
  }

  get isValid() {
    return (this._name.length)
  }

  toJSON() {
    return {
      name: this._name,
      completed: this._completed,
      hidden: this._hidden
    }
  }
}
