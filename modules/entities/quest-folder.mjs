export default class QuestFolder {
  static questDirName = {
    root: '_fql_quests',
    active: '_fql_active',
    completed: '_fql_completed',
    failed: '_fql_failed',
    hidden: '_fql_hidden'
  };

  static _questDirIds = {
    root: null,
    active: null,
    completed: null,
    failed: null,
    hidden: null
  };

  /**
   * Returns true if quest directory has been created
   *
   * @param folder
   * @returns {boolean}
   */
  static folderExists(folder = 'root') {
    let result = game.journal.directory.folders.find(f => f.name === this.questDirName[folder]);

    return result !== undefined;
  }

  /**
   * Initializes the creation of quest folders
   *
   * @returns {Promise<void>}
   */
  static async initializeJournals() {
    let dirExists = this.folderExists();

    if (!dirExists) {
      let rootFolder = await Folder.create({name: this.questDirName.root, type: "JournalEntry", parent: null});

      for (let [key, value] of Object.entries(this.questDirName)) {
        if (key === 'root') continue;
        await Folder.create({name: value, type: "JournalEntry", parent: rootFolder._id});
      }
    }

    for (let key in this.questDirName) {
      let folder = await game.journal.directory.folders.find(f => f.name === this.questDirName[key]);
      this._questDirIds[key] = folder._id;
    }
  }

  /**
   * Retrieves instance of specified Quest folder
   *
   * @param target
   * @returns {*}
   */
  static get(target) {
    return game.journal.directory.folders.find(f => f.name === this.questDirName[target]);
  }

  /**
   * Retrieves IDs of quest folders
   *
   * @returns {{hidden: null, root: null, active: null, completed: null, failed: null}}
   */
  static get questDirIds() {
    return this._questDirIds;
  }
}
