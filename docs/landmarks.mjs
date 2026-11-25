// Things found at real ocean depths, labelled as a dive passes them. Depths are approximate and in
// metres. Each row is [depth, side of the screen, silhouette shown beside the label or null,
// label]. Sides are chosen so that labels at close depths do not overlap. A label that starts with
// "zone:" names an ocean zone.
const rows = [
  [12, 'right', 'warship', 'USS Arizona · Pearl Harbor, 1941'],
  [93, 'left', 'liner', 'Lusitania · torpedoed in 1915'],
  [200, 'left', null, 'zone:The twilight zone'],
  [214, 'right', null, 'deepest freedive ever, on one breath'],
  [332, 'left', null, 'deepest scuba dive ever'],
  [500, 'right', null, 'pressure here is 51 times the surface'],
  [565, 'left', 'penguin', 'emperor penguins dive this deep'],
  [828, 'right', null, 'the Burj Khalifa is this tall'],
  [1000, 'left', null, 'zone:The midnight zone'],
  [1050, 'right', null, 'no sunlight reaches this deep'],
  [1280, 'left', 'turtle', 'leatherback turtles dive this deep'],
  [1642, 'right', null, 'Lake Baikal, the deepest lake, ends here'],
  [2200, 'left', 'galleon', 'SS Central America · the “Ship of Gold”'],
  [2250, 'right', 'whale', 'sperm whales hunt giant squid down here'],
  [2388, 'left', 'seal', 'deepest elephant seal dive'],
  [2800, 'right', 'warship', 'HMS Hood · sunk by the Bismarck, 1941'],
  [2992, 'left', 'whale', 'Cuvier’s beaked whale · deepest mammal dive'],
  [3008, 'right', 'galleon', 'Endurance · Shackleton’s ship, found 2022'],
  [3700, 'left', null, 'the average depth of the ocean'],
  [3800, 'right', 'liner', 'RMS Titanic · sank 1912, found 1985'],
  [4000, 'left', null, 'zone:The abyss'],
  [4100, 'right', null, 'pressure here is over 400 times the surface'],
  [4791, 'left', 'warship', 'Bismarck · German battleship, sank 1941'],
  [5074, 'right', 'warship', 'USS Yorktown · lost at Midway, 1942'],
  [5500, 'left', 'warship', 'USS Indianapolis · found in 2017'],
  [6000, 'left', null, 'zone:The hadal zone'],
  [6469, 'right', 'warship', 'USS Johnston · destroyer found in 2021'],
  [6500, 'left', null, 'the submersible Alvin can reach this deep'],
  [6865, 'right', 'warship', 'USS Samuel B. Roberts · deepest wreck found'],
  [6957, 'left', 'octopus', 'deepest octopus ever filmed'],
];

export const facts = rows.map(([depth, side, sprite, label]) => {
  const zone = label.startsWith('zone:');
  return { depth, side, sprite, text: zone ? label.slice(5) : label, zone };
});
