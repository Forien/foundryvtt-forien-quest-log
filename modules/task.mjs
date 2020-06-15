export default class Task {
  constructor(data = {}) {
    this._name = data.name || null;
    this._completed = data.completed || false;
    this._failed = data.failed || false;
    this._hidden = data.hidden || false;
  }

  toggle() {
    if (this._completed === false && this._failed === false) {
      this._completed = true;
    } else if (this._completed === true) {
      this._failed = true;
      this._completed = false;
    } else {
      this._failed = false;
    }
  }

  get state() {
    if (this._completed) {
      return 'check-square';
    } else if (this._failed) {
      return 'minus-square';
    }
    return 'square';
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

  get failed() {
    return this._failed;
  }

  set failed(failed) {
    this._failed = (failed === true);
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
      failed: this._failed,
      hidden: this._hidden
    }
  }
}
