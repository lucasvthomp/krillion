// Only include prompts for which both the broad name and the listed varieties qualify.
// True synonyms share an entry. Varieties are independent entries with their own tiers.
const regionalDishes = ['0226', '0692'];
const families = [
  [[...regionalDishes, '0317'], [
    ['Tikka masala', 10], ['Chicken tikka masala', 30], ['Paneer tikka masala', 60],
    ['Lamb tikka masala', 60], ['Tofu tikka masala', 85], ['Chickpea tikka masala', 85],
    ['Korma', 10, ['Qorma']], ['Chicken korma', 30, ['Chicken qorma', 'Murgh korma']],
    ['Lamb korma', 60], ['Navratan korma', 85, ['Navratan qorma']],
    ['Vindaloo', 10], ['Chicken vindaloo', 30], ['Pork vindaloo', 60], ['Lamb vindaloo', 60],
    ['Saag', 30], ['Saag paneer', 60], ['Sarson ka saag', 85],
    ['Jalfrezi', 30], ['Chicken jalfrezi', 60], ['Paneer jalfrezi', 85],
  ]],
  [['0735'], [['Tikka masala', 10], ['Chicken tikka masala', 30]]],
  [regionalDishes, [
    ['Biryani', 10, ['Biriyani', 'Briyani']], ['Chicken biryani', 30, ['Murgh biryani']],
    ['Hyderabadi biryani', 60], ['Lucknowi biryani', 85, ['Awadhi biryani']],
    ['Dal', 10, ['Daal', 'Dhal', 'Dahl']], ['Dal tadka', 30, ['Daal tadka']],
    ['Dal makhani', 60, ['Daal makhani']], ['Dal baati churma', 85],
    ['Dosa', 10, ['Dosai']], ['Masala dosa', 30], ['Rava dosa', 60, ['Rawa dosa']], ['Neer dosa', 85],
  ]],
  [['0100'], [
    ['Prairie dog', 10, ['Prairie dogs', 'Cynomys']], ['Black-tailed prairie dog', 30, ['Cynomys ludovicianus']],
    ['White-tailed prairie dog', 60, ['Cynomys leucurus']], ["Gunnison's prairie dog", 60, ['Cynomys gunnisoni']],
    ['Utah prairie dog', 85, ['Cynomys parvidens']], ['Mexican prairie dog', 85, ['Cynomys mexicanus']],
    ['Chipmunk', 10], ['Eastern chipmunk', 30], ['Siberian chipmunk', 60], ["Merriam's chipmunk", 85],
    ['Beaver', 10], ['American beaver', 30, ['North American beaver']], ['Eurasian beaver', 60],
    ['Squirrel', 10], ['Gray squirrel', 30, ['Grey squirrel']],
    ['Eastern gray squirrel', 60, ['Eastern grey squirrel']], ['Western gray squirrel', 60, ['Western grey squirrel']],
    ['Abert’s squirrel', 85], ['Porcupine', 10], ['North American porcupine', 30], ['Crested porcupine', 60],
    ['Capybara', 10], ['Lesser capybara', 85], ['Chinchilla', 10], ['Long-tailed chinchilla', 60],
    ['Hamster', 10], ['Syrian hamster', 30, ['Golden hamster']], ['Roborovski hamster', 60],
    ['Gerbil', 10], ['Mongolian gerbil', 60], ['Vole', 10], ['Prairie vole', 60],
  ]],
  [['0086'], [
    ['Frog', 10], ['Tree frog', 30], ['Red-eyed tree frog', 60], ['Glass frog', 60],
    ['Toad', 10], ['Cane toad', 30], ['Natterjack toad', 85],
    ['Salamander', 10], ['Fire salamander', 30], ['Chinese giant salamander', 60],
    ['Newt', 10], ['Smooth newt', 30], ['Great crested newt', 60], ['Iberian ribbed newt', 85],
  ]],
  [['0204'], [
    ['Box turtle', 10], ['Eastern box turtle', 30], ['Coahuilan box turtle', 85],
    ['Snapping turtle', 10], ['Common snapping turtle', 30], ['Alligator snapping turtle', 60],
    ['Softshell turtle', 30], ['Spiny softshell turtle', 60], ['Yangtze giant softshell turtle', 85],
  ]],
  [['0211'], [
    ['Kangaroo', 10], ['Red kangaroo', 30], ['Antilopine kangaroo', 85],
    ['Wallaby', 10], ['Red-necked wallaby', 60], ['Parma wallaby', 85],
    ['Wombat', 10], ['Common wombat', 30], ['Northern hairy-nosed wombat', 85],
    ['Opossum', 10], ['Virginia opossum', 30], ['Water opossum', 85],
  ]],
  [['0114'], [
    ['Cheesecake', 10], ['New York cheesecake', 30, ['New York-style cheesecake']],
    ['Basque burnt cheesecake', 60, ['Basque cheesecake']], ['Japanese cheesecake', 60],
    ['Chiffon cake', 30], ['Lemon chiffon cake', 60], ['Pandan chiffon cake', 85],
    ['Sponge cake', 10], ['Victoria sponge cake', 30, ['Victoria sandwich cake']],
    ['Genoise sponge cake', 60, ['Genoise', 'Génoise']],
  ]],
  [['0010'], [
    ['Cheddar', 10, ['Cheddar cheese']], ['Smoked cheddar', 30], ['Clothbound cheddar', 60],
    ['West Country Farmhouse Cheddar', 85], ['Mozzarella', 10, ['Mozzarella cheese']],
    ['Buffalo mozzarella', 60, ['Mozzarella di bufala']], ['Fior di latte', 85],
    ['Gouda', 10, ['Gouda cheese']], ['Smoked Gouda', 30], ['Aged Gouda', 60],
  ]],
  [['0038'], [
    ['Margarita', 10], ['Mezcal margarita', 30], ["Tommy's margarita", 60], ['Cadillac margarita', 85],
    ['Negroni', 10], ['White Negroni', 60], ['Negroni Sbagliato', 85],
    ['Whiskey sour', 10, ['Whisky sour']], ['Boston sour', 60], ['New York sour', 85],
  ]],
  [['0917'], [
    ['Ramen', 10], ['Miso ramen', 30], ['Tonkotsu ramen', 60], ['Kitakata ramen', 85],
    ['Pho', 10, ['Phở']], ['Beef pho', 30, ['Phở bò']], ['Chicken pho', 60, ['Phở gà']],
    ['Laksa', 30], ['Curry laksa', 60], ['Asam laksa', 85],
  ]],
];

export function editorialAnswers(id) {
  return families.filter(([ids]) => ids.includes(id)).flatMap(([, answers]) => answers);
}
