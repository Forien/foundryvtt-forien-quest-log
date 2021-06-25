import Enrich                    from '../control/Enrich.js';
import Fetch                     from '../control/Fetch.js';
import Socket                    from '../control/Socket.js';
import Utils                     from '../control/Utils.js';
import Quest                     from '../model/Quest.js';
import QuestFolder               from '../model/QuestFolder.js';
import { constants, settings }   from '../model/constants.js';

export default class QuestForm extends FormApplication
{
   /**
    * @param parentId
    *
    * @param options
    */
   constructor({ parentId = void 0, ...options } = {})
   {
      super({}, options);
      this._submitted = false;

      this._parentId = parentId;
      this._subquest = parentId !== void 0;

      this._image = 'actor';
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
         minimizable: false,
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

      // Get the default permission setting and attempt to set it if found in ENTITY_PERMISSIONS.
      const defaultPerm = game.settings.get(constants.moduleName, settings.defaultPermission);

      let permission = typeof CONST.ENTITY_PERMISSIONS[defaultPerm] === 'number' ?
       CONST.ENTITY_PERMISSIONS[defaultPerm] : CONST.ENTITY_PERMISSIONS.OBSERVER;

      try
      {
         // This is a sanity filter to make sure giver is an actual UUID that resolves. If not set it to null.
         const entity = await fromUuid(formData.giver);
         giver = entity.uuid;
      }
      catch (e)
      {
         giver = null;
      }

      let name = formData.name;

      if (name.length === 0)
      {
         name = game.i18n.localize('ForienQuestLog.NewQuest');
      }

      const description = (formData.description && formData.description.length) ? formData.description :
       this.description;

      const gmnotes = (formData.gmnotes && formData.gmnotes.length) ? formData.gmnotes : this.gmnotes;

      let data = {
         giver,
         name,
         description,
         gmnotes,
         image: this._image
      };

      // Used for a player created quest setting all users as owners and the quest as 'available'.
      if (!game.user.isGM)
      {
         data.status = 'available';
         permission = CONST.ENTITY_PERMISSIONS.OWNER;
      }

      if (formData.giver === 'abstract')
      {
         data.giver = formData.giver;
         data.image = formData.sourceImage;
         data.giverName = formData.giverName;
      }

      if (this._subquest) { data.parent = this._parentId; }

      // Creating a new quest will add any missing data / schema.
      data = new Quest(data);

      const entry = await JournalEntry.create({
         name,
         folder: QuestFolder.get().id,
         permission: { default: permission },
         flags: {
            [constants.moduleName]: {
               json: data.toJSON()
            }
         }
      });

      if (this._subquest)
      {
         const parentQuest = Fetch.quest(this._parentId);

         if (parentQuest)
         {
            parentQuest.addSubquest(entry.id);
            await parentQuest.save();
            Socket.refreshQuestPreview({ questId: parentQuest.id });
         }
      }

      // Players don't see Hidden tab, but assistant GM can, so emit anyway
      Socket.refreshQuestLog();
      this._submitted = true;
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
         const giver = await Enrich.giverFromUUID(giverId);

         // Set initial image swap for actor / token.
         this._image = 'actor';

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

            if (giver.hasTokenImg) { html.find('.toggleImage').removeClass('hidden'); }
            else { html.find('.toggleImage').addClass('hidden'); }

            html.find('.deleteQuestGiver').removeClass('hidden');
         }
         else
         {
            html.find('.toggleImage').addClass('hidden');
            html.find('.deleteQuestGiver').addClass('hidden');

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

      html.on('click', '.add-new-task', async () =>
      {
         const el = await renderTemplate('modules/forien-quest-log/templates/partials/quest-form/task.html', {});

         html.find('.list').append(el);
         html.find('.del-btn').unbind();
         html.on('click', '.del-btn', (event) => { $(event.target).parent().remove(); });
      });

      html.on('click', '.drop-info', () =>
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

               html.find('.deleteQuestGiver').removeClass('hidden');
            },
         }).browse(currentPath);
      });

      html.on('click', '.toggleImage', async(event) =>
      {
         event.stopPropagation();

         const giverId = html.find('#giver').val();

         this._image = this._image === 'actor' ? 'token' : 'actor';

         const giver = await Enrich.giverFromUUID(giverId, this._image);

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
         }
      });

      html.on('click', '.deleteQuestGiver', (event) =>
      {
         event.stopPropagation();

         this._image = 'actor';

         html.find('#giver').val(void 0);
         html.find('#sourceImage').val(void 0);
         html.find('.quest-giver-name').val(void 0);
         html.find('.quest-giver-name').slideUp();
         html.find('.giver-portrait').css('background-image', `url('')`).addClass('hidden');
         html.find('.drop-info').removeClass('hidden');

         html.find('.toggleImage').addClass('hidden');
         html.find('.deleteQuestGiver').addClass('hidden');
      });
   }

   /**
    * Retrieves Data to be used in rendering template.
    *
    * @override
    * @inheritDoc
    */
   async getData(options = {})
   {
      if (this._subquest)
      {
         const parentQuest = Fetch.quest(this._parentId);
         if (parentQuest)
         {
            this.options.title += ` – ${game.i18n.format('ForienQuestLog.QuestForm.SubquestOf',
             { name: parentQuest.name })}`;
         }
      }

      return {
         isGM: game.user.isGM,
         subquest: this._subquest,
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

      if (editor.mce)
      {
         this[name] = editor.mce.getContent();
      }

      return super.saveEditor(name, options);
   }
}
