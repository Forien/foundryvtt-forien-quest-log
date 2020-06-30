import constants from "../constants.mjs";
import VersionCheck from "./version-check.mjs";


/**
 * Based on https://github.com/Moerill/mess
 * with permission from Moerill
 *
 * @author Forien
 */
class WelcomeScreen extends Application {
  static get defaultOptions() {
    let title = game.modules.get(constants.moduleName).data.title;
    return mergeObject(super.defaultOptions, {
      template: `modules/${constants.moduleName}/templates/welcome-screen.html`,
      resizable: true,
      width: 450,
      height: 636,
      classes: ["welcome-screen"],
      title: `${title} - Welcome Screen`
    });
  }

  getData(options = {}) {
    options = super.getData(options);
    options.wfrp4e = game.system.data.name === 'wfrp4e';
    options.isChecked = !VersionCheck.check(constants.moduleName);
    options.moduleName = constants.moduleName;
    return options;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(`.show-again-${constants.moduleName}`).on('change', event => {
      let version = "0.0.0";
      if (event.currentTarget.checked)
        version = VersionCheck.get(constants.moduleName);

      VersionCheck.set(constants.moduleName, version)
    });

    $(`#section-${constants.moduleName}`).on("click", ".expand", event => {
      event.preventDefault();
      let target = $(event.currentTarget).data('target');
      $(`#section-${constants.moduleName} .${target}`).slideToggle(200);
      $(event.currentTarget).toggleClass('expanded');
    })
  }
}

export default function renderWelcomeScreen() {
  (new WelcomeScreen()).render(true);
}
