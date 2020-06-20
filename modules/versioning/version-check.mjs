/**
 * Simple class that can help with checking if module has been updated.
 *
 * Check if module is updated by calling VersionCheck.check(yourModuleName)
 *
 * Set new version afterwards by calling VersionCheck.set(yourModuleName, version)
 *
 * @author Forien
 */
export default class VersionCheck {
  static _r = false;

  static _reg(mN) {
    if (this._r) return;

    game.settings.register(mN, 'version', {
      name: `${mN} Version`,
      default: "0.0.0",
      type: String,
      scope: 'client',
    });

    this._r = true;
  }

  static check(mN) {
    if (!this._r) this._reg(mN);

    let mV = this.get(mN);
    let oV = game.settings.get(mN, "version");

    return isNewerVersion(mV, oV);
  };

  static set(mN, v) {
    if (!this._r) this._reg(mN);

    game.settings.set(mN, "version", v);
  }

  static get(mN) {
    return game.modules.get(mN).data.version;
  }
}
