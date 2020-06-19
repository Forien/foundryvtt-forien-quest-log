import constants from "../scripts/constants.mjs";
import VersionCheck from "./version-check.mjs";

class WelcomeScreen extends Application {
  static get defaultOptions() {
    let title = game.modules.get(constants.moduleName).data.title;
    return mergeObject(super.defaultOptions, {
      template: `modules/forien-quest-log/templates/welcome-screen.html`,
      resizable: true,
      width: 450,
      height: 600,
      classes: ["welcome-screen"],
      title: `${title} - Welcome Screen`
    });
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find('.show-again').on('change', event => {
      let version = "0.0.0";
      if (event.currentTarget.checked)
        version = VersionCheck.get(constants.moduleName);

      VersionCheck.set(constants.moduleName, version)
    })
  }
}

export default function renderWelcomeScreen() {
  (new WelcomeScreen()).render(true);
}
