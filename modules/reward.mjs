export default class Reward {
  constructor(data = {}) {
    this._type = data.type || null;
    this._data = data.data || {};
  }

  get type() {
    return this._type;
  }

  set type(type) {
    this._type = type;
  }

  get data() {
    return this._data;
  }

  set data(data) {
    this._data = data;
  }

  get isValid() {
    return (this._type !== null)
  }

  toJSON() {
    return {
      type: this._type,
      data: this._data
    }
  }
}
