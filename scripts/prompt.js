(() =>
{
   const module = "Forien's Quest Log";
   const author = "Forien";
   const message = "<p>Thank you for downloading our modules! We are implementing a new, unified Welcome Screen to contain information for any/all of our Foundry Workshop modules.</p><p>We strongly recommend you install it so that you are updated and notified about new versions. The new Welcome Screen is highly customizable and offers several different display options.</p>";
   const messageEnable = "You have installed Foundry Workshop Welcome Screen. Do you want to enable it now?";
   const disclaimer = "Clicking 'Install' will download the 'Foundry Workshop Welcome Screen' module and install it into your Foundry instance. It will also send you back to the setup screen where you will need to re-launch your world.";
   const ending = "Sincerely,";
   const manifest = 'https://raw.githubusercontent.com/Foundry-Workshop/welcome-screen/master/module.json';
   const wsID = 'workshop-welcome-screen';

   let testSetup = async () =>
   {
      let response = {};
      try
      {
         response = await fetch(SetupConfiguration.setupURL, {
            method: "POST",
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({})
         });
      }
      catch (e)
      {
         return false;
      }

      return response.status !== 403;
   };

   let tryInstall = async () =>
   {
      let test = await testSetup();

      if (test === true)
      {
         ui.notifications.active = [];
         ui.notifications.info("Preparing to download module…", {permanent: true});
         const notif = ui.notifications.active[0];
         game.socket.on("progress", data =>
         {
            notif.html(data.msg);
         });
         await SetupConfiguration.installPackage({type: "module", manifest: manifest});
         await game.shutDown();
      }
      else
      {
         new Dialog({
            title: `Foundry is protected`,
            content: `<p>Your Foundry VTT instance's setup is password protected (which is good!). Because of it, you need to 'back to setup' and install the module manually, or come back after you login as an administrator.</p><p>Click on the link below to copy it:</p><input id="workshop-welcome-screen-manifest" type="text" value="${manifest}" style="margin: 8px 4px"/>`,
            buttons: {
               shutdown: {
                  label: "Back to Setup",
                  callback: () =>
                  {
                     game.shutDown();
                  }
               },
               close: {
                  label: "Close",
               }
            }
         })._render(true).then(() =>
         {
            document.getElementById("workshop-welcome-screen-manifest").onclick = function ()
            {
               this.select();
               document.execCommand('copy');
               ui.notifications.info("Manifest URL copied!", {});
            }
         });
      }
   };

   let installPrompt = () =>
   {
      if (window.workshopWS.app)
      {
         return;
      }
      game.settings.register(wsID, 'showPrompt', {scope: "client", config: false, default: true});
      if (!game.settings.get(wsID, 'showPrompt'))
      {
         return;
      }

      let authors = Object.keys(window.workshopWS.authors).join(' and ');
      let modules = window.workshopWS.modules.map(m => `<li>${m}</li>`).join('');

      window.workshopWS.app = new Dialog({
          title: `Install Welcome Screen for Foundry Workshop's modules?`,
          content: `<img src="https://avatars3.githubusercontent.com/u/69402909?s=80&v=4" style="float: right; border: none; margin: 6px"/>${message}<div><strong>Installed modules:</strong><div style="height: 180px; overflow: auto"><ul>${modules}</ul></div></div><p>${ending}<br>${authors}</p><p><small>${disclaimer}</small></p><style>#${wsID}-install-prompt button { height: 34px } #${wsID}-install-prompt .dialog-buttons { flex: 0 1 }</style>`,
          buttons: {
             cancel: {
                label: "No"
             },
             never: {
                label: "Never show again",
                callback: () =>
                {
                   game.settings.set(wsID, 'showPrompt', false)
                }
             },
             install: {
                label: "Install",
                callback: () =>
                {
                   tryInstall()
                }
             }
          },
          default: 'install'
       },
       {id: `${wsID}-install-prompt`, width: 420, height: 540});
      window.workshopWS.app.render(true);
   };

   let enablePrompt = () =>
   {
      if (window.workshopWS.app)
      {
         return;
      }
      game.settings.register(wsID, 'showPrompt', {scope: "client", config: false, default: true});
      if (!game.settings.get(wsID, 'showPrompt'))
      {
         return;
      }

      window.workshopWS.app = new Dialog({
         title: `Enable Welcome Screen?`,
         content: `<img src="https://avatars3.githubusercontent.com/u/69402909?s=80&v=4" style="float: right; border: none; margin: 6px"/><p>${messageEnable}</p>`,
         buttons: {
            cancel: {
               label: "No"
            },
            never: {
               label: "Never show again",
               callback: () =>
               {
                  game.settings.set(wsID, 'showPrompt', false)
               }
            },
            install: {
               label: "Enable",
               callback: () =>
               {
                  const settings = game.settings.get("core", ModuleManagement.CONFIG_SETTING);
                  const setting = mergeObject(settings, {[wsID]: true});
                  game.settings.set("core", ModuleManagement.CONFIG_SETTING, setting);
               }
            }
         },
         default: 'install'
      });
      window.workshopWS.app.render(true);
   };

   Hooks.on("init", () =>
   {
      if (window.workshopWS === undefined)
      {
         window.workshopWS = {
            modules: [module],
            authors: {
               [author]: true
            },
            app: undefined
         };
      }
      else
      {
         window.workshopWS.modules.push(module);
         window.workshopWS.authors[author] = true;
      }
   });

   Hooks.on("ready", () =>
   {
      if (!game.user.isGM)
      {
         return;
      }

      const ws = game.modules.get(wsID);
      if (ws === undefined)
      {
         installPrompt();
      }
      else if (!ws.active)
      {
         enablePrompt();
      }
   });
})();