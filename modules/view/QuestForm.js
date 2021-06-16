import ViewData      from './ViewData.js';
import Socket        from '../control/Socket.js';
import QuestFolder   from '../model/QuestFolder.js';
import Quest         from '../model/Quest.js';
import Utils         from '../utils/Utils.js';
import constants     from '../constants.js';

export default class QuestForm extends FormApplication
{
   /**
    * @param subquest
    * @param parentId
    * @param options
    */
   constructor({ parentId = void 0, ...options } = {})
   {
      super({}, options);

      this._submitted = false;

      this.parentId = parentId;
      this.subquest = parentId !== void 0;
   }

   /**
    * Default Application options
    *
    * @returns {Object}
    */
   static get defaultOptions()
   {
      return mergeObject(super.defaultOptions, {
         id: 'forien-quest-log-form',
         template: 'modules/forien-quest-log/templates/quest-form.html',
         title: game.i18n.localize('ForienQuestLog.QuestForm.Title'),
         width: 940,
         height: 640,
         closeOnSubmit: true
      });
   }

   /**
    * Do not handle submitting data when the event is 'mcesave' for TinyMCE saving data.
    *
    * @private
    * @override
    * @inheritDoc
    */
   async _onSubmit(event, options)
   {
      if (event && event.type === 'mcesave') { return; }
      return super._onSubmit(event, options);
   }

   /**
    * Called 'on submit'. Handles saving the form data.
    *
    * @private
    * @override
    * @inheritDoc
    */
   async _updateObject(event, formData)
   {
      let giver;
      let permission = 0;

      try
      {
         const entity = await fromUuid(formData.giver);
         giver = entity.uuid;
      }
      catch (e)
      {
         giver = null;
      }

      let title = formData.title;
      if (title.length === 0)
      {
         title = game.i18n.localize('ForienQuestLog.NewQuest');
      }

      const description = (formData.description !== undefined && formData.description.length) ? formData.description :
       this.description;

      const gmnotes = (formData.gmnotes !== undefined && formData.gmnotes.length) ? formData.gmnotes : this.gmnotes;

      let data = {
         giver,
         title,
         description,
         gmnotes
      };

      if (!game.user.isGM)
      {
         data.status = 'available';
         permission = 3;
      }

      if (formData.giver === 'abstract')
      {
         data.giver = formData.giver;
         data.image = formData.sourceImage;
         data.giverName = formData.giverName;
      }

      if (this.subquest)
      {
         data.parent = this.parentId;
      }

      data = new Quest(data);

      const entry = await JournalEntry.create({
         name: title,
         folder: QuestFolder.get().id,
         permission: { default: permission },
         flags: {
            [constants.moduleName]: {
               json: data.toJSON()
            }
         }
      });

      if (this.subquest)
      {
         const parentQuest = await Quest.get(this.parentId);
         parentQuest.addSubquest(entry.id);
         await parentQuest.save();

         Socket.refreshQuestPreview(parentQuest.id);
      }

      // players don't see Hidden tab, but assistant GM can, so emit anyway
      Socket.refreshQuestLog();
      this._submitted = true;

      return entry;
   }

   /**
    * Provide TinyMCE overrides.
    *
    * @override
    */
   activateEditor(name, options = {}, initialContent = '')
   {
      super.activateEditor(name, Object.assign({}, options, Utils.tinyMCEOptions()), initialContent);
   }

   /**
    * Defines all event listeners like click, drag, drop etc.
    *
    * @override
    * @inheritDoc
    */
   activateListeners(html)
   {
      super.activateListeners(html);

      html.on('change', '#giver', async (event) =>
      {
         const giverId = $(event.currentTarget).val();
         const giver = await ViewData.giverFromUUID(giverId);

         if (giver)
         {
            if (giver?.img?.length)
            {
               html.find('.giver-portrait').attr({
                  style: `background-image:url(${giver.img})`,
                  title: giver.name
               }).removeClass('hidden');
            }
            else
            {
               html.find('.giver-portrait').attr('style', '').addClass('hidden');
            }
            html.find('.drop-info').addClass('hidden');
         }
         else
         {
            html.find('.giver-portrait').addClass('hidden');
            html.find('.drop-info').removeClass('hidden');
         }
      });

      html.on('drop', '.giver-data-fieldset', async (event) =>
      {
         event.preventDefault();
         const data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));

         const uuid = Utils.getUUID(data, ['Actor', 'Item', 'JournalEntry']);

         if (uuid !== void 0)
         {
            html.find('#giver').val(uuid).change();
            html.find('.quest-giver-name').slideUp();
         }
      });

      html.on('click', '.add-new-task', () =>
      {
         renderTemplate('modules/forien-quest-log/templates/partials/quest-form/task.html', {}).then((el) =>
         {
            html.find('.list').append(el);
            html.find('.del-btn').unbind();
            html.on('click', '.del-btn', (event) =>
            {
               $(event.target).parent().remove();
            });
         });
      });

      html.on('click', '.source-image', () =>
      {
         const currentPath = html.find('.quest-giver-name').val();
         new FilePicker({
            type: 'image',
            current: currentPath,
            callback: (path) =>
            {
               html.find('#giver').val('abstract');
               html.find('#sourceImage').val(path);
               html.find('.quest-giver-name').slideDown();
               html.find('.giver-portrait').css('background-image', `url(${path})`).removeClass('hidden');
               html.find('.drop-info').addClass('hidden');
            },
         }).browse(currentPath);
      });
   }

   async close(options)
   {
      if (this._submitted)
      {
         return super.close(options);
      }

      new Dialog({
         title: game.i18n.localize('ForienQuestLog.CloseDialog.Title'),
         content: `<h3>${game.i18n.localize('ForienQuestLog.CloseDialog.Header')}</h3>
<p>${game.i18n.localize('ForienQuestLog.CloseDialog.Body')}</p>`,
         buttons: {
            no: {
               icon: `<i class="fas fa-undo"></i>`,
               label: game.i18n.localize('ForienQuestLog.CloseDialog.Cancel')
            },
            yes: {
               icon: `<i class="far fa-trash-alt"></i>`,
               label: game.i18n.localize('ForienQuestLog.CloseDialog.Discard'),
               callback: () =>
               {
                  this._submitted = true;
                  this.close();
               }
            }
         },
         default: 'no'
      }).render(true);
   }

   /**
    * Retrieves Data to be used in rendering template.
    *
    * @override
    * @inheritDoc
    */
   async getData(options = {})
   {
      if (this.subquest)
      {
         const parentQuest = await Quest.get(this.parentId);
         this.options.title += ` – ${game.i18n.format('ForienQuestLog.QuestForm.SubquestOf', 
          { name: parentQuest.name })}`;
      }

      return {
         isGM: game.user.isGM,
         subquest: this.subquest,
         options: mergeObject(this.options, options)
      };
   }

   /**
    * Fired whenever any of TinyMCE editors is saved.
    * Just pass data to object's property, we handle save in one go after submit
    *
    * @override
    * @inheritDoc
    */
   async saveEditor(name, options)
   {
      const editor = this.editors[name];

      if (editor.mce) { this[name] = editor.mce.getContent(); }

      return super.saveEditor(name, options);
   }
}
