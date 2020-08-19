/*
 * Add listeners for socket events
 */
Hooks.once('ready', () => {
  console.log('Fog Tools | Ready');
  game.socket.on('module.fog-tools', data => {
    if (data.event === 'reveal') handleReveal(data);
    if (data.event === 'reset') handleReset(data);
  });
});

/*
 * Add buttons to lighting tools
 */
Hooks.on('getSceneControlButtons', (controls) => {
  // Only show tools for GMs
  if (!game.user.isGM) return;
  // Get lighting controls
  let lighting = controls.find(layer => layer.name === 'lighting');
  // Remove default reset button (since we replace with our improved version)
  lighting.tools = lighting.tools.filter(tool => tool.name !== 'reset');
  // Add custom tools
  lighting.tools.push({
    name: 'reveal',
    title: game.i18n.localize('FOGTOOLS.reveal'),
    icon: 'fas fa-eye',
    onClick: async () => {
      const html = await getContent('reveal');
      Dialog.confirm({
        title: game.i18n.localize('FOGTOOLS.reveal'),
        content: html,
        yes: (html) => {
          let sel = html.find('[name="players"]').val();
          dispatchReveal(sel);
        },
        defaultYes: true,
      });
    },
    button: true,
  },{
    name: 'reset',
    title: game.i18n.localize('FOGTOOLS.reset'),
    icon: 'fas fa-cloud',
    onClick: async () => {
      const html = await getContent('reset');
      Dialog.confirm({
        title: game.i18n.localize('FOGTOOLS.reset'),
        content: html,
        yes: (html) => {
          let sel = html.find('[name="players"]').val();
          dispatchReset(sel);
        },
        defaultYes: true,
      });
    },
    button: true,
  });
});

/*
 * Get handlebars templates for dialogs
 */
async function getContent(name) {
  const players = game.users.filter(p => p.active);
  const path = '/modules/fog-tools/templates';
  const html = await renderTemplate(`${path}/${name}.html`, { players });
  return html;
}

/*
 * Send socket event to reveal fog
 */
function dispatchReveal(player) {
  game.socket.emit('module.fog-tools', { event: 'reveal', player });
}

/*
 * Send socket event to reset fog
 */
function dispatchReset(user) {
  console.log(user);
  if (user === 'all') user = null;
  // Requests individual user to reset fog exploration
  SocketInterface.dispatch("modifyDocument", {
    type: "FogExploration",
    action: "delete",
    data: {user, scene: canvas.scene.id},
    options: { reset: true }
  })
}

/*
 * React to socket event to reveal fog
 */
function handleReveal(data) {
  console.log(data);
  if(['all', game.user.id].includes(data.player)) {
    revealFog();
  }
}

/*
* Reveals all fog of war to explored state
*/
function revealFog() {
  // Set desired level of opacity for revealed areas
  const opacity = 0x999999;

  // Get fog obj
  const fog = canvas.sight.fog;

  // Create a new render texture
  const revealed = PIXI.RenderTexture.create({
    width: canvas.dimensions.width,
    height: canvas.dimensions.height,
    scale: 1,
    resolution: canvas.sight._fogResolution
  });
  // Fill render texture with desired opacity
  const fill = new PIXI.Graphics();
  fill.beginFill(opacity);
  fill.drawRect(0, 0, canvas.dimensions.width, canvas.dimensions.height);
  fill.endFill();

  // Render fill to the texture
  canvas.app.renderer.render(fill, revealed);

  // Swap the staging texture to the rendered texture
  fog.rendered.texture.destroy(true);
  fog.rendered.texture = revealed;
}
