'use strict';
window.LS_DATA = Object.freeze({
  version: 7.2,
  personalities: ['Kind','Ambitious','Curious','Calm','Bold','Funny','Romantic','Practical','Creative','Competitive','Shy','Social','Stubborn','Empathetic','Independent','Adventurous','Responsible','Athletic'],
  talents: ['Music','Writing','Art','Sports','Math','Science','Programming','Business','Languages','Acting','Fashion','Cooking','Photography','Gaming','Leadership','Dance'],
  names: ['Mina','Lena','Sofia','Emma','Ari','Nora','Maya','Iris','Lina','Elena','Avery','Jade','Theo','Noah','Leo','Eli','Kai','Lucas','Julian','Alex','Mia','Jordan','Sam','Rowan'],
  places: ['Ho Chi Minh City, Vietnam','Seoul, South Korea','Tokyo, Japan','London, UK','Paris, France','New York City, USA','Vancouver, Canada','Singapore','Bangkok, Thailand','Sydney, Australia'],
  weatherTypes: ['Sunny','Cloudy','Rainy','Stormy','Cool','Hot','Windy'],
  moods: ['good','busy','quiet','excited','stressed','curious','tired','happy','annoyed','confident','lonely'],
  ageRules: {
    phone: 15,
    partTimeWork: 16,
    adult: 18,
    investing: 18,
    datingApps: 18,
    independentTravel: 18,
    smallBusiness: 6,
    cookingHelp: 7,
    driving: 16
  },
  catalog: {
    umbrella: {name:'Umbrella',price:12,category:'Clothing & weather',minAge:0,permissionPrice:35,durable:true,use:'rain',description:'Keeps you drier in rain.'},
    raincoat: {name:'Raincoat',price:28,category:'Clothing & weather',minAge:0,permissionPrice:35,durable:true,wearable:true,use:'rain',description:'Wearable rain protection.'},
    sweater: {name:'Sweater',price:24,category:'Clothing & weather',minAge:0,permissionPrice:35,durable:true,wearable:true,use:'cold',description:'Helps with cool weather.'},
    sunglasses: {name:'Sunglasses',price:18,category:'Clothing & weather',minAge:4,permissionPrice:35,durable:true,wearable:true,use:'sun',description:'Useful in bright weather.'},
    waterBottle: {name:'Water bottle',price:15,category:'Everyday',minAge:3,permissionPrice:35,durable:true,use:'drink',description:'Reusable bottle for water.'},
    backpack: {name:'Backpack',price:35,category:'School',minAge:5,permissionPrice:60,durable:true,wearable:true,description:'Carries school and outing items.'},
    book: {name:'Book',price:20,category:'Hobbies',minAge:4,permissionPrice:40,durable:true,use:'read',description:'A book you can read or gift.'},
    artSupplies: {name:'Art supplies',price:25,category:'Hobbies',minAge:4,permissionPrice:45,durable:true,use:'art',description:'Paper, pencils, paint and craft supplies.'},
    toy: {name:'Toy',price:25,category:'Toys',minAge:0,permissionPrice:40,durable:true,use:'play',description:'A toy appropriate to the character age.'},
    makeup: {name:'Makeup set',price:45,category:'Beauty',minAge:13,permissionPrice:50,durable:false,use:'appearance',description:'Cosmetics for appearance and style.'},
    snackPack: {name:'Snack pack',price:6,category:'Food',minAge:5,permissionPrice:25,durable:false,use:'food',description:'A small personal snack to eat later.'},
    hoodie: {name:'Hoodie',price:40,category:'Clothing',minAge:6,permissionPrice:45,durable:true,wearable:true,use:'cold',description:'Everyday clothing for style and cooler weather.'},
    skincare: {name:'Skincare set',price:30,category:'Beauty',minAge:13,permissionPrice:45,durable:false,use:'appearance',description:'Basic personal-care products.'},
    sportsBall: {name:'Sports ball',price:30,category:'Sports & transport',minAge:6,permissionPrice:45,durable:true,use:'play',description:'For outdoor practice and games.'},
    deskLamp: {name:'Desk lamp',price:45,category:'Furniture',minAge:8,permissionPrice:55,durable:true,use:'study',description:'A small room item that makes study time more comfortable.'},
    giftBox: {name:'Small gift',price:20,category:'Gifts',minAge:6,permissionPrice:35,durable:true,use:'gift',description:'A simple present you can keep or give to someone.'},
    usedCar: {name:'Used car',price:6500,category:'Vehicles',minAge:18,permissionPrice:0,durable:true,use:'transport',description:'An older personal car for adult transportation.'},
    headphones: {name:'Headphones',price:80,category:'Electronics',minAge:10,permissionPrice:50,durable:true,use:'music',description:'Personal headphones for music and media.'},
    bicycle: {name:'Bicycle',price:220,category:'Sports & transport',minAge:6,permissionPrice:50,durable:true,use:'bike',description:'Transport, exercise and recreation.'},
    gameConsole: {name:'Game console',price:450,category:'Electronics',minAge:8,permissionPrice:40,durable:true,use:'game',description:'Home gaming system.'},
    tablet: {name:'Tablet',price:350,category:'Electronics',minAge:8,permissionPrice:40,durable:true,use:'device',description:'Shared-schoolwork and entertainment device.'},
    laptop: {name:'Laptop',price:900,category:'Electronics',minAge:10,permissionPrice:35,durable:true,use:'computer',description:'Computer for school, creative work and jobs.'},
    phoneUsed: {name:'Used smartphone',price:250,category:'Electronics',minAge:12,permissionPrice:35,durable:true,phone:true,model:'Used smartphone',condition:68,description:'Cheaper, older phone. Independent use still follows phone-age rules.'},
    phone: {name:'Smartphone',price:600,category:'Electronics',minAge:12,permissionPrice:30,durable:true,phone:true,model:'Smartphone',condition:100,description:'Mainstream new smartphone.'},
    phoneFlagship: {name:'Flagship smartphone',price:1100,category:'Electronics',minAge:14,permissionPrice:20,durable:true,phone:true,model:'Flagship smartphone',condition:100,description:'Expensive premium phone.'}
  },
  chores: [
    {id:'tidyRoom',name:'Clean room',minAge:5,minutes:30,pay:[1,4],responsibility:4},
    {id:'dishes',name:'Wash dishes',minAge:7,minutes:25,pay:[1,4],responsibility:4},
    {id:'trash',name:'Take trash out',minAge:7,minutes:10,pay:[1,3],responsibility:3},
    {id:'pet',name:'Feed pet',minAge:6,minutes:10,pay:[0,3],responsibility:3},
    {id:'vacuum',name:'Vacuum',minAge:9,minutes:35,pay:[2,6],responsibility:5},
    {id:'laundry',name:'Help with laundry',minAge:10,minutes:40,pay:[2,6],responsibility:5},
    {id:'cookHelp',name:'Help cook',minAge:7,minutes:35,pay:[0,4],responsibility:4},
    {id:'babysit',name:'Babysit sibling',minAge:13,minutes:120,pay:[5,20],responsibility:7}
  ],
  standProducts: [
    {id:'lemonade',name:'Lemonade',baseCost:0.65,basePrice:3,weatherBonus:{Hot:22,Sunny:12,Rainy:-30,Stormy:-45}},
    {id:'cookies',name:'Cookies',baseCost:0.8,basePrice:3,weatherBonus:{Rainy:3,Stormy:-8}},
    {id:'cupcakes',name:'Cupcakes',baseCost:1.2,basePrice:4,weatherBonus:{Hot:-8,Rainy:3}},
    {id:'bracelets',name:'Bracelets',baseCost:1.5,basePrice:7,weatherBonus:{Sunny:5,Rainy:-12}},
    {id:'drawings',name:'Drawings',baseCost:0.5,basePrice:6,weatherBonus:{Sunny:5,Rainy:-15}}
  ],
  standLocations: [
    {id:'home',name:'Outside home',traffic:42,safety:95,minAge:6},
    {id:'park',name:'Near the park',traffic:65,safety:80,minAge:8},
    {id:'community',name:'Community event',traffic:82,safety:90,minAge:8},
    {id:'school',name:'School fundraiser',traffic:74,safety:96,minAge:7}
  ],
  clubDefs: {
    'Art Club': {skill:'art',actions:[['practice','Draw / create',60],['special','Prepare an exhibit',90],['social','Collaborate with member',45]]},
    'Reading Club': {skill:'reading',actions:[['practice','Read & discuss',60],['special','Reading challenge',90],['social','Talk about a book',40]]},
    'Music Group': {skill:'music',actions:[['practice','Rehearse',75],['special','Perform',120],['social','Jam with member',60]]},
    'Music': {skill:'music',actions:[['practice','Rehearse',75],['special','Perform',120],['social','Jam with member',60]]},
    'Sports Club': {skill:'sports',actions:[['practice','Train',75],['special','Play match',120],['social','Talk to teammate',45]]},
    'Football': {skill:'sports',actions:[['practice','Train',90],['special','Play match',120],['social','Talk to teammate',45]]},
    'Nature Club': {skill:'nature',actions:[['practice','Explore nature',75],['special','Community project',120],['social','Work with member',45]]},
    'Chess Club': {skill:'chess',actions:[['practice','Practice puzzles',45],['special','Play tournament game',90],['social','Play a friendly match',45]]},
    'Science Club': {skill:'science',actions:[['practice','Run experiment',75],['special','Build science project',120],['social','Work with teammate',60]]},
    'Drama': {skill:'acting',actions:[['practice','Rehearse',90],['special','Audition / perform',120],['social','Talk with cast',45]]},
    'Coding Club': {skill:'coding',actions:[['practice','Build project',90],['special','Hackathon session',150],['social','Pair program',60]]},
    'Debate': {skill:'debate',actions:[['practice','Practice argument',60],['special','Debate match',120],['social','Prep with teammate',60]]},
    'Photography': {skill:'photography',actions:[['practice','Photo walk',75],['special','Submit photo',60],['social','Shoot with member',60]]}
  },
  schoolEvents: {
    young: ['School Art Day','Reading Challenge','Mini Sports Day','Class Science Showcase'],
    middle: ['Math Challenge','Science Fair','Art Showcase','School Sports Meet','Coding Challenge'],
    high: ['Math Olympiad','Science Fair','Debate Tournament','Art Showcase','Coding Challenge','School Sports Meet','Talent Show']
  },
  jobs: {
    teen: [
      {id:'cafe',title:'Cafe assistant',pay:14,hours:4,minAge:16},
      {id:'retail',title:'Retail associate',pay:15,hours:4,minAge:16},
      {id:'babysitter',title:'Babysitter',pay:16,hours:3,minAge:16},
      {id:'tutor',title:'Tutor',pay:18,hours:3,minAge:16},
      {id:'dogwalk',title:'Dog walker',pay:13,hours:2,minAge:16},
      {id:'freelanceArt',title:'Freelance artist',pay:20,hours:3,minAge:16}
    ],
    adult: [
      {id:'office',title:'Office coordinator',pay:24,hours:8,minAge:18},
      {id:'developer',title:'Junior developer',pay:32,hours:8,minAge:18,skill:'Programming'},
      {id:'designer',title:'Junior designer',pay:28,hours:8,minAge:18,skill:'Art'},
      {id:'teacherAide',title:'Teaching assistant',pay:23,hours:7,minAge:18},
      {id:'creator',title:'Content creator',pay:22,hours:6,minAge:18},
      {id:'sales',title:'Sales associate',pay:25,hours:8,minAge:18}
    ]
  },
  placesOutside: [
    {id:'park',name:'Park',minAge:0,cost:0,minutes:90,weatherSensitive:true},
    {id:'playground',name:'Playground',minAge:2,maxAge:12,cost:0,minutes:90,weatherSensitive:true},
    {id:'library',name:'Library',minAge:5,cost:0,minutes:120},
    {id:'mall',name:'Mall',minAge:8,cost:8,minutes:180},
    {id:'cafe',name:'Cafe',minAge:12,cost:12,minutes:90},
    {id:'restaurant',name:'Restaurant',minAge:0,cost:22,minutes:120},
    {id:'cinema',name:'Cinema',minAge:8,cost:18,minutes:180},
    {id:'gym',name:'Gym',minAge:14,cost:15,minutes:90},
    {id:'supermarket',name:'Supermarket',minAge:5,cost:5,minutes:90},
    {id:'beach',name:'Beach',minAge:0,cost:10,minutes:240,weatherSensitive:true},
    {id:'friend',name:"Friend's house",minAge:6,cost:0,minutes:180}
  ],
  eventDefs: [
    {id:'familyOrdinary',minAge:0,maxAge:5,weight:8,cooldown:8,title:'A small family moment',text:'An ordinary moment with family becomes part of your early memory.',choices:['Lean into it','Keep playing']},
    {id:'relativeBabyShower',minAge:0,maxAge:99,weight:1,cooldown:150,title:'A baby shower in the family',text:'A relative is expecting a baby, and the family is gathering to celebrate.',choices:['Attend with family','Help choose a gift','Stay home']},
    {id:'birthdayInvite',minAge:3,maxAge:18,weight:4,cooldown:35,title:'Birthday invitation',text:'Someone your age invites you to a birthday party.',choices:['Go','Ask caregiver / make a plan','Decline']},
    {id:'neighborhoodDay',minAge:4,maxAge:99,weight:2,cooldown:80,title:'Something is happening nearby',text:'Neighbors are gathering for a small community event.',choices:['Go see','Help out','Stay home']},
    {id:'neighborMoves',minAge:3,maxAge:99,weight:4,cooldown:45,title:'Someone is moving in nearby',text:'A moving truck stops in the neighborhood. New people can change old routines.',choices:['Pay attention','Leave them alone']},
    {id:'findCoins',minAge:5,maxAge:99,weight:3,cooldown:35,title:'Something on the ground',text:'You notice some money near the pavement.',choices:['Pick it up','Leave it']},
    {id:'rainPlan',minAge:3,maxAge:99,weight:5,cooldown:14,weather:['Rainy','Stormy'],title:'The weather changes the plan',text:'Rain disrupts what people around you expected to do today.',choices:['Adapt the plan','Stay home']},
    {id:'schoolRumor',minAge:10,maxAge:18,weight:4,cooldown:21,school:true,title:'Two versions of the same story',text:'A rumor is spreading at school and people disagree about what actually happened.',choices:['Stay out of it','Ask what happened','Pass it on']},
    {id:'friendInvite',minAge:6,maxAge:60,weight:5,cooldown:12,title:'An invitation',text:'Someone you know wants to spend time together soon.',choices:['Accept','Maybe later','Decline']},
    {id:'parentGrades',minAge:7,maxAge:18,weight:3,cooldown:30,school:true,title:'A caregiver asks about school',text:'A caregiver wants to know how things are going academically.',choices:['Show everything','Downplay problems','Ask for help']},
    {id:'creativeNotice',minAge:10,maxAge:99,weight:1,cooldown:90,title:'Someone notices your work',text:'Something creative you made gets unexpected attention.',choices:['Share more','Keep it private']},
    {id:'celebritySighting',minAge:12,maxAge:99,weight:.35,cooldown:180,title:'A familiar face?',text:'You think you recognize a public figure nearby. It might become a story—or nothing at all.',choices:['Stay respectful','Say hello','Ignore it']}
  ]
});
