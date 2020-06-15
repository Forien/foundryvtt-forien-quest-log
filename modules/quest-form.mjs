import QuestFolder from "./quest-folder.mjs";
import Utils from "./utils.mjs";
import Task from "./task.mjs";
import Quest from "./quest.mjs";
import Socket from "./socket.mjs";

export default class QuestForm extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "forien-quest-log-form",
      template: "modules/forien-quest-log/templates/quest-log-form.html",
      title: "Add new Quest",
      width: 940,
      height: 640,
      closeOnSubmit: true
    });
  }

  async getData(options = {}) {
    return mergeObject(super.getData(), {
      options: options,
      isGM: game.user.isGM
    });
  }

  getHiddenFolder() {
    return QuestFolder.get('hidden');
  }

  async _updateObject(event, formData) {
    let actor = Utils.findActor(formData.actor);

    if (actor !== false) {
      actor = actor._id;
    }

    let title = formData.title;
    if (title.length === 0)
      title = 'New Quest';

    let tasks = [];
    if (formData.tasks !== undefined) {
      if (!Array.isArray(formData.tasks)) {
        formData.tasks = [formData.tasks];
      }
      tasks = formData.tasks.filter(t => t.length > 0).map(t => {
        return new Task({name: t});
      });
    }

    let description = (formData.description !== undefined && formData.description.length) ? formData.description : this.description;
    let gmnotes = (formData.gmnotes !== undefined && formData.gmnotes.length) ? formData.gmnotes : this.gmnotes;

    let data = {
      actor: actor,
      title: title,
      description: description,
      gmnotes: gmnotes,
      tasks: tasks
    };

    data = new Quest(data);

    let folder = this.getHiddenFolder();

    JournalEntry.create({
      name: title,
      content: JSON.stringify(data),
      folder: folder._id
    }).then(() => {
      game.questlog.render(true);
      // players don't see Hidden tab, but assistant GM can, so emit anyway
      Socket.refreshQuestLog();
    });
  }

  async _onEditorSave(target, element, content) {
    this[target] = content;

    // keep function to override parent function
    // we don't need to submit form on editor save
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.on("change", "#actor", (event) => {
      let actorId = $(event.currentTarget).val();

      let actor = Utils.findActor(actorId);

      if (actor !== false) {
        html.find('.actor-portrait').attr('src', actor.img).removeClass('hidden');
        html.find('.actor-name').text(actor.name).removeClass('hidden');
      }
    });

    html.on("drop", ".actor-data-fieldset", (event) => {
      event.preventDefault();
      let data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));
      if (data.type === 'Actor') {
        html.find('#actor').val(data.id).change();
      }
    });

    html.on("click", ".add-new-task", () => {
      renderTemplate('modules/forien-quest-log/templates/partials/quest-log-form-task.html', {}).then(el => {

        html.find('.list').append(el);
        html.find('.del-btn').unbind();
        html.on("click", ".del-btn", (event) => {
          $(event.target).parent().remove();
        });
      });
    });
  }
};
