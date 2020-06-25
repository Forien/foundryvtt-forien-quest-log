export default class QuestFolder {
  static questDirName = '_fql_quests';
  static _questDirId = null;

  /**
   * Returns true if quest directory has been created
   *
   * @param folder
   * @returns {boolean}
   */
  static folderExists(folder = 'root') {
    let result = game.journal.directory.folders.find(f => f.name === this.questDirName);

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
      await Folder.create({name: this.questDirName.root, type: "JournalEntry", parent: null});
    }

    let folder = await game.journal.directory.folders.find(f => f.name === this.questDirName);
    this._questDirId = folder._id;
  }

  /**
   * Retrieves instance of Quest folder
   *
   * @returns {*}
   */
  static get() {
    return game.journal.directory.folders.find(f => f.name === this.questDirName);
  }
}
