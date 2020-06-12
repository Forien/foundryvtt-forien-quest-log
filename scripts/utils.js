ForienQuestLog.Utils = class {
 static findActor(actorId) {
    let actor = game.actors.find(a => a._id === actorId);
    if (actor === undefined || actor === null) {
      actor = game.actors.find(a => a.name === actorId);
    }

    if (actor === undefined || actor === null) {
      return false;
    }

    return actor;
  }
};
