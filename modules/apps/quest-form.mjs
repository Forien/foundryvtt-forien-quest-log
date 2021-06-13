import QuestFolder from "../entities/quest-folder.mjs";
import Utils from "../utility/utils.mjs";
import Task from "../entities/task.mjs";
import Quest from "../entities/quest.mjs";
import Socket from "../utility/socket.mjs";
import constants from "../constants.mjs";

export default class QuestForm extends FormApplication {
  submitted = false;

  /**
   * Default Application options
   *
   * @returns {Object}
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "forien-quest-log-form",
      template: "modules/forien-quest-log/templates/quest-form.html",
      title: game.i18n.localize("ForienQuestLog.QuestForm.Title"),
      width: 940,
      height: 640,
      closeOnSubmit: true
    });
  }

  /**
   * Provide TinyMCE overrides.
   * @override
   */
  activateEditor(name, options={}, initialContent="") {
    super.activateEditor(name, Object.assign({}, options, Utils.tinyMCEOptions()), initialContent);
  }

  /**
   * Retrieves Data to be used in rendering template.
   *
   * @param options
   * @returns {Promise<Object>}
   */
  async getData(options = {}) {
    this.subquest = (this.object.id !== undefined);
    const parent = this.subquest ? this.object : null;

console.log(`!! QuestForm - getData - this.subquest: ${this.subquest} - parent / this.object: ${parent}`);
    if (this.subquest)
      this.options.title += ` – ${game.i18n.format('ForienQuestLog.QuestForm.SubquestOf', {name: parent.name})}`;

    return {
      isGM: game.user.isGM,
      subquest: this.subquest,
      parent: parent,
      options: mergeObject(this.options, options)
    };
  }

  /**
   * Proxy for QuestFolder.get('hidden').
   * Needed? probably not...
   *
   * @returns {*}
   */
  getHiddenFolder() {
    return QuestFolder.get('hidden');
  }

  /**
   * Called "on submit". Handles saving Form's data
   *
   * @param event
   * @param formData
   * @private
   */
  async _updateObject(event, formData) {
    const actor = Utils.findActor(formData.giver);
    let giver = null;
    let permission = 0;

    if (actor !== false) {
      giver = actor.uuid;
console.log(`!! quest-form - _updateObject - 0 - giver: ${giver}`);
    } else {
      try {
        const entity = await fromUuid(formData.giver);
        giver = entity.uuid;
console.log(`!! quest-form - _updateObject - 1 - giver: ${giver}`);
      } catch (e) {
        giver = null;
      }
    }
console.log(`!! quest-form - _updateObject - 2 - giver: ${giver}`);

    let title = formData.title;
    if (title.length === 0)
      title = game.i18n.localize("ForienQuestLog.NewQuest");

    let tasks = [];
    if (formData.tasks !== undefined) {
      if (!Array.isArray(formData.tasks)) {
        formData.tasks = [formData.tasks];
      }
      tasks = formData.tasks.filter(t => t.length > 0).map(t => {
        return new Task({name: t});
      });
    }

    const description = (formData.description !== undefined && formData.description.length) ? formData.description :
      this.description;

    const gmnotes = (formData.gmnotes !== undefined && formData.gmnotes.length) ? formData.gmnotes : this.gmnotes;

    let data = {
      giver: giver,
      title: title,
      description: description,
      gmnotes: gmnotes,
      tasks: tasks
    };

    if (!game.user.isGM) {
      data.status = 'available';
      permission = 3;
    }

    if (formData.giver === 'abstract') {
      data.giver = formData.giver;
      data.image = formData.sourceImage;
      data.giverName = formData.giverName;
    }

    if (this.subquest) {
      data.parent = this.object.id;
    }

console.log(`!! quest-form - _updateObject - 3 - this.subquest: ${this.subquest} data: ${JSON.stringify(data)}`);

    data = new Quest(data);

console.log(`!! quest-form - _updateObject - 4 - this.subquest: ${this.subquest} data: ${JSON.stringify(data)}`);

    let folder = this.getHiddenFolder();

    return JournalEntry.create({
      name: title,
      folder: folder.id,
      permission: {default: permission},
      flags: {
        [constants.moduleName]: {
          json: data.toJSON()
        }
      }
    }).then((entry) => {
      if (this.subquest) {
        this.object.addSubquest(entry.id);
        this.object.save().then(() => {
          Socket.refreshQuestPreview(this.object.id);
        });
      }
      // players don't see Hidden tab, but assistant GM can, so emit anyway
      Socket.refreshQuestLog();
      this.submitted = true;

      return entry;
    });
  }

  async close(options) {
    if (this.submitted) {
    return super.close(options);
  }

    new Dialog({
      title: game.i18n.localize("ForienQuestLog.CloseDialog.Title"),
      content: `<h3>${game.i18n.localize("ForienQuestLog.CloseDialog.Header")}</h3>
<p>${game.i18n.localize("ForienQuestLog.CloseDialog.Body")}</p>`,
      buttons: {
        no: {
          icon: `<i class="fas fa-undo"></i>`,
          label: game.i18n.localize("ForienQuestLog.CloseDialog.Cancel")
        },
        yes: {
          icon: `<i class="far fa-trash-alt"></i>`,
          label: game.i18n.localize("ForienQuestLog.CloseDialog.Discard"),
          callback: () => {
            this.submitted = true;
            this.close();
          }
        }
      },
      default: "no"
    }).render(true);
  }

  /**
   * Need to override because of earlier bad design caused bug with text editors inheriting parent's data
   *
   * @param div
   * @private
   */
  _activateEditor(div) {
    const temp = this.object;
    this.object = undefined;
    super._activateEditor(div);
    this.object = temp;
  }

  /**
   * Fired whenever any of TinyMCE editors is saved.
   * Just pass data to object's property, we handle save in one go after submit
   *
   * @see _updateObject()
   *
   * @param target
   * @param element
   * @param content
   * @returns {Promise<void>}
   * @private
   */
  async _onEditorSave(target, element, content) {
    this[target] = content;

    // keep function to override parent function
    // we don't need to submit form on editor save
  }

  /**
   * Defines all event listeners like click, drag, drop etc.
   *
   * @param html
   */
  activateListeners(html) {
    super.activateListeners(html);

    html.on("change", "#giver", async (event) => {
      const giverId = $(event.currentTarget).val();
      let giver;

console.log(`!! quest-form - #giver change - A - giverId: ${giverId}`);
      try {
        giver = Utils.findActor(giverId);
console.log(`!! quest-form - #giver change - 0 - giver: ${giver}`);
        if (giver === false) {

          giver = await fromUuid(giverId);

console.log(`!! quest-form - #giver change - 1 - giver: ${giver}`);
        }
      } catch (e) {
        giver = false;
      }

console.log(`!! quest-form - #giver change - 2 - giver: ${giver}`);

      if (giver) {
        if (giver?.img?.length) {
          html.find('.giver-portrait').attr({
            'style': 'background-image:url(' + giver.img + ')',
            'title': giver.name
          }).removeClass('hidden');
        } else {
          html.find('.giver-portrait').attr('style', '').addClass('hidden');
        }
        html.find('.drop-info').addClass('hidden');
      } else {
        html.find('.giver-portrait').addClass('hidden');
        html.find('.drop-info').removeClass('hidden');
      }
    });

    html.on("drop", ".giver-data-fieldset", async (event) => {
      event.preventDefault();
      let data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));
      if (['Actor', 'Item', 'JournalEntry'].includes(data.type)) {
        let uuid = `${data.type}.${data.id}`;
        html.find('#giver').val(uuid).prop('readonly', false).change();
        html.find('.quest-giver-name').slideUp();
      }
    });

    html.on("click", ".add-new-task", () => {
      renderTemplate('modules/forien-quest-log/templates/partials/quest-form/task.html', {}).then(el => {

        html.find('.list').append(el);
        html.find('.del-btn').unbind();
        html.on("click", ".del-btn", (event) => {
          $(event.target).parent().remove();
        });
      });
    });

    html.on("click", ".source-image", () => {
      let currentPath = html.find('.quest-giver-name').val();
      new FilePicker({
        type: "image",
        current: currentPath,
        callback: path => {
          html.find('#giver').val('abstract').prop('readonly', true);
          html.find('#sourceImage').val(path);
          html.find('.quest-giver-name').slideDown();
          html.find('.giver-portrait').css('background-image', `url(${path})`).removeClass('hidden');
          html.find('.drop-info').addClass('hidden');
        },
      }).browse(currentPath);
    });
  }
};
