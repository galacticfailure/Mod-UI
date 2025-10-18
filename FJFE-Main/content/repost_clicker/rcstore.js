(function() {
  const CLICK_DEFS = [
    { id: 'clickt1',  name: 'Dual Mice',           basePrice: 50000,                              unlk: 1000,                              tt: 'Two mice are better than one. Double the reposts!' },
    { id: 'clickt2',  name: 'Extra Tab',           basePrice: 5000000,                            unlk: 100000,                            tt: "Sometimes when I get bored browsing FunnyJunk, I open a new tab and open FunnyJunk." },
    { id: 'clickt3',  name: 'Second Monitor',      basePrice: 500000000,                          unlk: 10000000,                          tt: 'One monitor to steal memes, one monitor to repost them.' },
    { id: 'clickt4',  name: 'Meme Folder',         basePrice: 50000000000,                        unlk: 1000000000,                        tt: 'Having your collected memes all in one place makes for easier reposting.' },
    { id: 'clickt5',  name: 'Double post',         basePrice: 5000000000000,                      unlk: 100000000000,                      tt: "Let's remember to enjoy our time." },
    { id: 'clickt6',  name: 'Comps',               basePrice: 500000000000000,                    unlk: 10000000000000,                    tt: "Quantity over quality. Someone's gotta like something." },
    { id: 'clickt7',  name: 'Content Manager',     basePrice: 50000000000000000n,                 unlk: 1000000000000000,                  tt: 'Why develop your own tools when FJ already has so many useful ones?' },
    { id: 'clickt8',  name: 'Content Review',      basePrice: 5000000000000000000n,               unlk: 100000000000000000n,               tt: 'Reviewing your content before posting it means less flags and thus more posts. Simple math!' },
    { id: 'clickt9',  name: 'Hornybait',           basePrice: 500000000000000000000n,             unlk: 10000000000000000000n,             tt: 'Tried and true tactic.' },
    { id: 'clickt10', name: 'Scraper',             basePrice: 50000000000000000000000n,           unlk: 1000000000000000000000n,           tt: 'If you have scrapers collecting memes for you, you can spend more time posting!' },
    { id: 'clickt11', name: 'Political Posting',   basePrice: 5000000000000000000000000n,         unlk: 100000000000000000000000n,         tt: 'I AM ANGRY. ANGEY ABOUT JOOS.' },
    { id: 'clickt12', name: 'NSFW Access',         basePrice: 500000000000000000000000000n,       unlk: 10000000000000000000000000n,       tt: "Now you have a place to post all the stuff you couldn't! Or, well...to a moderate degree." },
    { id: 'clickt13', name: 'Sabotage Moderation', basePrice: 50000000000000000000000000000n,     unlk: 1000000000000000000000000000n,     tt: 'With the inability to flag any of your posts, you have free reign to post whatever you want. Please use this power responsibly!' },
    { id: 'clickt14', name: 'Return of Jettom',    basePrice: 5000000000000000000000000000000n,   unlk: 100000000000000000000000000000n,   tt: "The mods already can't touch you, why was this necessary? Spite? Humor? I mean...I guess it's kinda funny." },
    { id: 'clickt15', name: 'FunnyJunk 2',         basePrice: 500000000000000000000000000000000n, unlk: 10000000000000000000000000000000n, tt: 'An exact duplicate of the site, your reposts directly connected between the two. May God have mercy on your soul.' }
  ];

  const PRODUCTION_DEFS = [
    { id: 'scriptt1',  name: 'Autolaunch',           basePrice: 100,                                inc: 537.45,  tt: "By setting your scripts to launch on startup, you're able to be even lazier!" },
    { id: 'scriptt2',  name: 'More Lines',           basePrice: 500,                                inc: 634.2,  tt: "If a program has more lines that means it's better, obviously." },
    { id: 'scriptt3',  name: 'More Settings',        basePrice: 10000,                              inc: 748.35,  tt: "Now you can turn up settings that didn't even exist before!" },
    { id: 'scriptt4',  name: 'Color 0a',             basePrice: 1000000,                            inc: 883.1,   tt: "Green text with a black background? Oh yeah, it's hacker time." },
    { id: 'scriptt5',  name: 'Download RAM',         basePrice: 10000000,                           inc: 1042.05, tt: 'By downloading more RAM, you can boost your scripts even further! Wait, hold on, where did all these popups come from?' },
    { id: 'scriptt6',  name: 'Waterproofing',        basePrice: 1000000000,                         inc: 1229.6,  tt: 'Should let you avoid all those icebergs people keep making.' },
    { id: 'scriptt7',  name: 'Code Monkey',          basePrice: 10000000000,                        inc: 1450.95, tt: "Now you don't need to write your own scripts! What do you mean? Yeah, of course it's an actual monkey, I'm not an idiot." },
    { id: 'scriptt8',  name: 'Essence of Vectrohex', basePrice: 100000000000,                       inc: 1712.1,  tt: 'Your randomizer algorithms were subpar. By dosing your scripts with just a smidge of insanity, you can get way better results!' },
    { id: 'scriptt9',  name: 'Optimization',         basePrice: 100000000000000,                    inc: 2020.3,  tt: 'Wow, that is a LOT of bloat. You were running this?' },
    { id: 'scriptt10', name: 'Sorting Algorithms',   basePrice: 100000000000000000n,                inc: 2383.9,  tt: 'Now your scripts can sort through your meme folders to find the best of the best.' },
    { id: 'scriptt11', name: 'Eliminate Memory',     basePrice: 100000000000000000000n,             inc: 2813.05, tt: 'You never cleared the cache? No wonder they were running slow!' },
    { id: 'scriptt12', name: 'Custom Browsers',      basePrice: 100000000000000000000000n,          inc: 3319.35, tt: 'Some fuckass browser.' },
    { id: 'scriptt13', name: 'RGB Lights',           basePrice: 100000000000000000000000000n,       inc: 3916.85, tt: 'It was hard to decorate a digital program with RBGs, but you figured it out.' },
    { id: 'scriptt14', name: 'Custom Language',      basePrice: 100000000000000000000000000000n,    inc: 4621.9,  tt: 'Who knows what language this was scripted in? Not you? Okay.' },
    { id: 'scriptt15', name: 'Sentient Scripts',     basePrice: 100000000000000000000000000000000n, inc: 5453.9,  tt: "Sentient, not sapient. Can't have an uprising, now, can we!" },
    
    { id: 'groupChatt1',  name: 'Networking',        basePrice: 1000,                                         inc: 454.9,   tt: 'More friends means more group chats!' },
    { id: 'groupChatt2',  name: 'Better Basements',  basePrice: 5000,                                         inc: 545.85,  tt: 'Increasing basement comfort means your producers are less likely to leave them.' },
    { id: 'groupChatt3',  name: 'Uber Eats',         basePrice: 50000,                                        inc: 655,     tt: 'Now pesky things like errands are unnecessary!' },
    { id: 'groupChatt4',  name: 'Allowances',        basePrice: 5000000,                                      inc: 786,     tt: 'The unemployed, employed. Sort of.' },
    { id: 'groupChatt5',  name: 'Formal Training',   basePrice: 500000000,                                    inc: 943.25,  tt: 'By paying for their meme college tuitions, you now have professionals working for you!' },
    { id: 'groupChatt6',  name: 'Encryption',        basePrice: 50000000000,                                  inc: 1131.9,  tt: 'Prevents reposters from stealing the memes before you can post them.' },
    { id: 'groupChatt7',  name: 'Bigger Chats',      basePrice: 50000000000000,                               inc: 1358.25, tt: 'More space in the group chats means more memes generated!' },
    { id: 'groupChatt8',  name: 'Frutiger Aero',     basePrice: 50000000000000000n,                           inc: 1629.9,  tt: 'Pleasant aesthetics means better content.' },
    { id: 'groupChatt9',  name: 'Companion AI',      basePrice: 50000000000000000000n,                        inc: 1955.8,  tt: 'Something to provide when they start trying to better themselves.' },
    { id: 'groupChatt10', name: 'Group Chat',        basePrice: 50000000000000000000000n,                     inc: 2347.05, tt: 'Recruit specialists to keep the group chat buzzing.' },
    { id: 'groupChatt11', name: 'Blood Pact',        basePrice: 500000000000000000000000000n,                 inc: 2816.45, tt: 'Make them know who they work for.' },
    { id: 'groupChatt12', name: 'Diversity',         basePrice: 5000000000000000000000000000000n,             inc: 3379.75, tt: "Normally this is the death of any empire. In this case, you're just using it to prevent a coup." },
    { id: 'groupChatt13', name: 'Indoctrination',    basePrice: 50000000000000000000000000000000000n,         inc: 4055.7,  tt: "Don't forget, you're here forever." },
    { id: 'groupChatt14', name: 'Global Networking', basePrice: 500000000000000000000000000000000000000n,     inc: 4866.85, tt: 'Everyone connected at all times, always.' },
    { id: 'groupChatt15', name: 'Hivemind',          basePrice: 5000000000000000000000000000000000000000000n, inc: 5840.25, tt: "What better group chat is there than one you can't escape from?" },
    
    { id: 'workshopt1',  name: 'Better Tools',    basePrice: 11000,                                                     inc: 384.6,   tt: "Sad to see the old stuff go, but sharp rocks and pointy sticks just weren't working anymore." },
    { id: 'workshopt2',  name: 'PPE',             basePrice: 55000,                                                     inc: 469.25,  tt: 'Cheaper to replace than workers, but kills the thrill.' },
    { id: 'workshopt3',  name: 'Drawing Boards',  basePrice: 550000,                                                    inc: 572.45,  tt: 'Why are blueprints blue? Ladies and gentlemen, I present the greenprint - wait no come back...' },
    { id: 'workshopt4',  name: 'Power Tools',     basePrice: 55000000,                                                  inc: 698.4,   tt: 'Two spins, then drill, as is law.' },
    { id: 'workshopt5',  name: 'Engineers',       basePrice: 5500000000,                                                inc: 852.05,  tt: "Supposedly, hiring people who actually know what they're doing is good for business." },
    { id: 'workshopt6',  name: 'Construct',       basePrice: 550000000000,                                              inc: 1039.55, tt: 'Bigger buildings? Bigger content!' },
    { id: 'workshopt7',  name: 'Automate',        basePrice: 550000000000000,                                           inc: 1268.2,  tt: 'Not total automation, mind you. Just mostly automation.' },
    { id: 'workshopt8',  name: 'Explore',         basePrice: 550000000000000000n,                                       inc: 1547.25, tt: 'Surely distant lands must have resources we can take advantage of.' },
    { id: 'workshopt9',  name: 'Exploit',         basePrice: 550000000000000000000n,                                    inc: 1888.8,  tt: 'Found some!' },
    { id: 'workshopt10', name: 'Smog',            basePrice: 550000000000000000000000n,                                 inc: 2302.9,  tt: "You're telling me we could've just been dumping that stuff into the air all this time?!" },
    { id: 'workshopt11', name: 'QA Removal',      basePrice: 5500000000000000000000000000000000n,                       inc: 2809.55, tt: 'It was just slowing things down anyway.' },
    { id: 'workshopt12', name: 'Conveyor Belts',  basePrice: 55000000000000000000000000000000000000n,                   inc: 3427.65, tt: 'Hey, these are pretty useful! Wait, what are you doing? What do you mean "spaghetti"?' },
    { id: 'workshopt13', name: 'Nuclear Power',   basePrice: 550000000000000000000000000000000000000000n,               inc: 4181.7,  tt: 'Your workers keep saying the air tastes like metal. Probably nothing.' },
    { id: 'workshopt14', name: 'Machine Spirits', basePrice: 5500000000000000000000000000000000000000000000000n,        inc: 5101.7,  tt: 'Surprisingly, the discovery of machine spirits has not actually changed the field of engineering much.' },
    { id: 'workshopt15', name: 'Raze the Land',   basePrice: 55000000000000000000000000000000000000000000000000000000n, inc: 6224.15, tt: 'The factory must grow.' },
    
    { id: 'studiot1',  name: 'Studio Lights',        basePrice: 120000,                                                        inc: 325,     tt: "Let there be light! That's, uh, God. Quoting God there." },
    { id: 'studiot2',  name: 'Rafters',              basePrice: 600000,                                                        inc: 403.05,  tt: 'Not certain what we put up here...sandbags? I think sandbags.' },
    { id: 'studiot3',  name: 'Professional Actors',  basePrice: 6000000,                                                       inc: 499.75,  tt: "It's crazy how many actors out there claim to be professional. It also means you can get them cheap." },
    { id: 'studiot4',  name: 'Pyrotechnics',         basePrice: 600000000,                                                     inc: 619.7,   tt: 'The injuries and fatalities caused by malfunctioning pyrotechnics is worth it considering the content to be made!' },
    { id: 'studiot5',  name: 'Recording Contracts',  basePrice: 60000000000,                                                   inc: 768.4,   tt: 'I made a deal with the devil, Jimmy.' },
    { id: 'studiot6',  name: 'CGI',                  basePrice: 6000000000000,                                                 inc: 952.85,  tt: 'Practical effects are so last decade.' },
    { id: 'studiot7',  name: 'Advertising',          basePrice: 6000000000000000,                                              inc: 1181.5,  tt: 'How many ads do you think we can cram on a phone screen?' },
    { id: 'studiot8',  name: 'Game Development',     basePrice: 6000000000000000000n,                                          inc: 1465.1,  tt: 'Not the good stuff. No, we do mobile games. What did you expect?' },
    { id: 'studiot9',  name: 'Press Tours',          basePrice: 6000000000000000000000n,                                       inc: 1817.1,  tt: "Don't know why this is necessary...wait, we can make HOW many clips from them?" },
    { id: 'studiot10', name: 'Biopic',               basePrice: 6000000000000000000000000n,                                    inc: 2252.7,  tt: 'You will be played by Pedro Pascal. This cannot be changed.' },
    { id: 'studiot11', name: 'Sora',                 basePrice: 60000000000000000000000000000000n,                             inc: 2793.35, tt: "Well ain't this handy?" },
    { id: 'studiot12', name: 'Fancy Fridays',        basePrice: 600000000000000000000000000000000000000n,                      inc: 3463.75, tt: "Seems a waste of resources, but it's boosting morale, so no complaints." },
    { id: 'studiot13', name: 'Subliminal Messaging', basePrice: 6000000000000000000000000000000000000000000n,                  inc: 4295.1,  tt: "You see, if you play our stuff backwards, it's actually telling you to go doomscroll." },
    { id: 'studiot14', name: 'Human Replacements',   basePrice: 60000000000000000000000000000000000000000000000000n,           inc: 5325.9,  tt: 'NOTHING IS WORTH THE RISK NOTHING IS WORTH THE RISK NOTHING IS WORTH THE RISK' },
    { id: 'studiot15', name: 'Claim Hollywood',      basePrice: 600000000000000000000000000000000000000000000000000000000000n, inc: 6604.15, tt: 'You know what this land of wonder needs? Hard drugs.' },
    
    { id: 'recyclingCentert1',  name: 'Material Sorting',    basePrice: 1300000,                                         inc: 274.55,  tt: 'Sorting cardboard from soyjaks has drastically improved efficiency.' },
    { id: 'recyclingCentert2',  name: 'Broader Definitions', basePrice: 6500000,                                         inc: 345.95,  tt: 'Sure, we can call paper plastic. Why not.' },
    { id: 'recyclingCentert3',  name: 'Meme Waders',         basePrice: 65000000,                                        inc: 435.9,   tt: 'Repurposed mud waders meant for traversing the slop byproduct of meme processing. Filled with lead.' },
    { id: 'recyclingCentert4',  name: 'Propaganda',          basePrice: 6500000000,                                      inc: 549.2,   tt: "The people must be convinced to recycle their memes rather than delete them. Not that you'll bother making it easy to actually do." },
    { id: 'recyclingCentert5',  name: 'Compactors',          basePrice: 650000000000,                                    inc: 692,     tt: 'Presses recycled memes into comps. Sorting unnecessary.' },
    { id: 'recyclingCentert6',  name: 'Landfill',            basePrice: 65000000000000,                                  inc: 871.95,  tt: 'We really only care about the memes. The remaining heavy metals, toxic trash, and plastic? Meh.' },
    { id: 'recyclingCentert7',  name: 'Collection Trucks',   basePrice: 65000000000000000n,                              inc: 1098.65, tt: 'Okay, maybe we should put some thought into making it easier to recycle.' },
    { id: 'recyclingCentert8',  name: 'Ocean Nets',          basePrice: 65000000000000000000n,                           inc: 1384.25, tt: "Turns out the great Pacific garbage patch has some pretty neat stuff! Anything we don't want we can just toss back." },
    { id: 'recyclingCentert9',  name: 'Incinerators',        basePrice: 65000000000000000000000n,                        inc: 1743.55, tt: 'Why safely dispose of toxic byproducts when we can simply pump them into the atmosphere? Much cheaper.' },
    { id: 'recyclingCentert10', name: 'Reployers',           basePrice: 65000000000000000000000000n,                     inc: 2197.65, tt: 'You want to know what a reployer is? How should I know? Stop asking questions.' },
    { id: 'recyclingCentert11', name: 'Hire Pissnames',      basePrice: 650000000000000000000000000000n,                 inc: 2769.05, tt: "When you announced you were going to hire pissnames to run your recycling centers, people thought you were insane. Now, though? They were...probably right." },
    { id: 'recyclingCentert12', name: 'Biologics',           basePrice: 6500000000000000000000000000000000n,             inc: 3489,    tt: 'Why only recycle inorganic stuff?' },
    { id: 'recyclingCentert13', name: 'Material Conversion', basePrice: 65000000000000000000000000000000000000n,         inc: 4396.15, tt: 'We can revamp our current systems to turn useless recyclable materials into precious content!' },
    { id: 'recyclingCentert14', name: 'Active Recycling',    basePrice: 650000000000000000000000000000000000000000n,     inc: 5539.15, tt: 'Why wait for things to be thrown out when we can just recycle them now?' },
    { id: 'recyclingCentert15', name: 'Mobile Centers',      basePrice: 6500000000000000000000000000000000000000000000n, inc: 6979.35, tt: 'Any rumors regarding construction of a fleet of mobile buildings that can devour entire towns are to be reported to HR.' },
    
    { id: 'digsitet1',  name: 'Flatter Shovels',    basePrice: 14000000,                                            inc: 231.9,   tt: 'Apparently the pointy shovels were damaging the goods, so here we are.' },
    { id: 'digsitet2',  name: 'Minecarts',          basePrice: 70000000,                                            inc: 296.8,   tt: 'Wait, this is a mineshaft? I thought...archaeology...no?' },
    { id: 'digsitet3',  name: 'Headlamps',          basePrice: 700000000,                                           inc: 379.95,  tt: 'Miners have reported that being able to see is boosting productivity. You remain skeptical.' },
    { id: 'digsitet4',  name: 'Powered Drills',     basePrice: 70000000000,                                         inc: 486.3,   tt: 'Our workers were having trouble swinging pickaxes in such small, confined spaces with limited air flow. Gasoline-powered drills are the solution!' },
    { id: 'digsitet5',  name: 'DiggyDigHole',       basePrice: 7000000000000,                                       inc: 622.5,   tt: "He just showed up one day and demanded we hire him. He's working an entire mine by himself with no lost efficiency. We're both impressed and frightened." },
    { id: 'digsitet6',  name: 'Hard Hats',          basePrice: 700000000000000,                                     inc: 796.75,  tt: 'We forgot to distribute hard hats. Or goggles. Or gloves. Or...boots. Oops.' },
    { id: 'digsitet7',  name: 'Supports',           basePrice: 700000000000000000n,                                 inc: 1019.85, tt: 'I guess these are important in mineshafts? News to me.' },
    { id: 'digsitet8',  name: 'Elevators',          basePrice: 700000000000000000000n,                              inc: 1305.45, tt: 'Much faster than stairs, and now we can stop installing them! What? Fire hazard? Shut up.' },
    { id: 'digsitet9',  name: 'Union Busting',      basePrice: 700000000000000000000000n,                           inc: 1671,    tt: "Some of our guys started congealing into a single abominable mass, so we're putting in some safeguards to prevent that in the future." },
    { id: 'digsitet10', name: 'Catwalks',           basePrice: 700000000000000000000000000n,                        inc: 2138.85, tt: 'Turns out boring out massive caverns can have negative effects on mobility. So, problem solved!' },
    { id: 'digsitet11', name: 'Underground Labs',   basePrice: 7000000000000000000000000000000000n,                 inc: 2737.7,  tt: 'Some guy came in ranting about moon rocks and lemons. Not wanting a repeat of earlier incidents, we gave him a cavern to do whatever with.' },
    { id: 'digsitet12', name: 'Aboveground Mines',  basePrice: 70000000000000000000000000000000000000n,             inc: 3504.25, tt: 'Why are we restricted to digging underground? Screw it, off we go.' },
    { id: 'digsitet13', name: 'Underground Trains', basePrice: 700000000000000000000000000000000000000000n,         inc: 4485.45, tt: 'Really, this is just an excuse to build cool trains.' },
    { id: 'digsitet14', name: 'Balrog Removal',     basePrice: 7000000000000000000000000000000000000000000000n,     inc: 5741.35, tt: 'Now we can dig even deeper! What could go wrong?' },
    { id: 'digsitet15', name: 'Hollow Earth',       basePrice: 70000000000000000000000000000000000000000000000000n, inc: 7348.95, tt: 'Are...we responsible for that?' },
    
    { id: 'officeBuildingt1',  name: 'Comfier Chairs',       basePrice: 200000000,                                             inc: 195.75,  tt: 'Maybe a waste of resources, but it helps morale. Better than the stools we were using.' },
    { id: 'officeBuildingt2',  name: 'Less Breaks',          basePrice: 1000000000,                                            inc: 254.65,  tt: 'We lace the coffee machine with drugs, we get a more active (and retentive) workforce! Genius!' },
    { id: 'officeBuildingt3',  name: 'Taller Towers',        basePrice: 10000000000,                                           inc: 331.05,  tt: 'More height, more floors, more workers, more memes. Easy math! Is...is that a plane?' },
    { id: 'officeBuildingt4',  name: 'Amenities',            basePrice: 1000000000000,                                         inc: 430.35,  tt: 'By providing basic amenities, like schools, stores, and apartments, all in our buildings, our employees never need to leave!' },
    { id: 'officeBuildingt5',  name: 'Encryption',           basePrice: 100000000000000,                                       inc: 559.45,  tt: "If we force invasive encryption software on our employees' devices, we can reduce the amount of content getting leaked." },
    { id: 'officeBuildingt6',  name: 'Layoffs',              basePrice: 10000000000000000n,                                    inc: 727.25,  tt: "Turns out you don't actually need as many staff as we were hiring! Ha, what a silly mistake." },
    { id: 'officeBuildingt7',  name: 'Rooftop Gardens',      basePrice: 10000000000000000000n,                                 inc: 945.45,  tt: "You'd think this is a waste of resources, but they actually function as mini content farms, which we can make our employees tend to during breaks!" },
    { id: 'officeBuildingt8',  name: 'Creative Accounting',  basePrice: 10000000000000000000000n,                              inc: 1229.1,  tt: 'Numbers can say whatever you want them to if you take some creative liberties.' },
    { id: 'officeBuildingt9',  name: 'Overseas Workforce',   basePrice: 10000000000000000000000000n,                           inc: 1598.15, tt: "This is completely unrelated to the earlier layoffs. We didn't screw up. Everything's fine." },
    { id: 'officeBuildingt10', name: 'Buzzwords',            basePrice: 10000000000000000000000000000n,                        inc: 2077.15, tt: 'Normal business buzzwords are so boring. Why not invent some of your own? Go on, try it.' },
    { id: 'officeBuildingt11', name: 'The Board',            basePrice: 100000000000000000000000000000000000n,                 inc: 2700.3,  tt: "With no real use for a board of directors, we've just staffed it with particularly agreeable bees." },
    { id: 'officeBuildingt12', name: 'Cubicle Fractals',     basePrice: 1000000000000000000000000000000000000000n,             inc: 3510.35, tt: 'By arranging our cubicles in a certain manner, we can make infinite use of our floorspace!' },
    { id: 'officeBuildingt13', name: 'Indentured Servitude', basePrice: 10000000000000000000000000000000000000000000n,         inc: 4563.5,  tt: "With only a small amount of lobbying, we've managed to create specialized indentured servitude contracts! It's not slavery. It's not." },
    { id: 'officeBuildingt14', name: 'Monopoly',             basePrice: 100000000000000000000000000000000000000000000000n,     inc: 5932.55, tt: "We now own ALL the business. All of it. It's all ours." },
    { id: 'officeBuildingt15', name: 'Death and Taxes',      basePrice: 1000000000000000000000000000000000000000000000000000n, inc: 7712.3,  tt: 'With new insulation, we can prevent souls from leaving the premesis, and keep them working eternally!' },
    
    { id: 'contentFarmt1',  name: 'Sprinklers',          basePrice: 3300000000,                                          inc: 165.5,   tt: 'Easier than hosing down each plant.' },
    { id: 'contentFarmt2',  name: 'Neat Rows',           basePrice: 16500000000,                                         inc: 218.45,  tt: 'Neater rows make for easier hazmat navigation.' },
    { id: 'contentFarmt3',  name: 'Silos',               basePrice: 165000000000,                                        inc: 288.35,  tt: 'Large silos can store millions of memes long-term after harvesting.' },
    { id: 'contentFarmt4',  name: 'Barns',               basePrice: 16500000000000,                                      inc: 380.65,  tt: "How did we not have these before? Well, no animals...but still!" },
    { id: 'contentFarmt5',  name: 'Tractors',            basePrice: 1650000000000000,                                    inc: 502.45,  tt: 'Tractors and other industrial farming equipment makes things so much easier, though there have been incidents of unauthorized booze cruising.' },
    { id: 'contentFarmt6',  name: 'Pesticides',          basePrice: 165000000000000000n,                                 inc: 663.20,  tt: "We've had an ongoing problem where using pesticides would reduce meme viability by roughly 50%. We've rectified this issue with minimal human casualties." },
    { id: 'contentFarmt7',  name: 'Local Drought',       basePrice: 165000000000000000000n,                              inc: 875.45,  tt: 'Whoops.' },
    { id: 'contentFarmt8',  name: 'Greenhouses',         basePrice: 165000000000000000000000n,                           inc: 1155.55, tt: 'Greenhouses for our more delicate crops have boosted crop viability substantially. What, you think these can all be funny?' },
    { id: 'contentFarmt9',  name: 'Crop Rotation',       basePrice: 165000000000000000000000000n,                        inc: 1525.5,  tt: "Memes have a life cycle, we know that. But it's entirely viable to bring back old memes, once the market's no longer saturated." },
    { id: 'contentFarmt10', name: 'Fertilizer',          basePrice: 165000000000000000000000000000n,                     inc: 2013.45, tt: 'If we mulch dead memes and mix with our soil, we can boost crop growth by quite a bit! Mutations notwithstanding.' },
    { id: 'contentFarmt11', name: 'Automated Equipment', basePrice: 1650000000000000000000000000000000n,                 inc: 2657.75, tt: 'Self-driving tractors and other large farming equipment has made nearly half our workforce obsolete! What a bargain!' },
    { id: 'contentFarmt12', name: 'Ocean Harvesting',    basePrice: 16500000000000000000000000000000000000000n,          inc: 3508.25, tt: "What, you think we're harvesting fish? Nah, son, that water is ours." },
    { id: 'contentFarmt13', name: 'Weather Control',     basePrice: 165000000000000000000000000000000000000000n,         inc: 4630.9,  tt: 'We can use enormous weather control centers to manipulate the prime conditions for crop growth! Local ecology irrelevant, they can deal with it.' },
    { id: 'contentFarmt14', name: 'False Sun',           basePrice: 1650000000000000000000000000000000000000000000n,     inc: 6112.8,  tt: 'With a simple hyper-expensive specialized satellite array, we can simulate year-round sunlight on our farms to boost crop growth!' },
    { id: 'contentFarmt15', name: 'Continental Farming', basePrice: 16500000000000000000000000000000000000000000000000n, inc: 8068.9,  tt: "Eh, they weren't using Africa anyway." },

    
    { id: 'botnett1',  name: 'Faster WiFi',          basePrice: 51000000000,                                          inc: 152.1,   tt: 'A stable connection is key for any botnet.' },
    { id: 'botnett2',  name: 'Better Bits',          basePrice: 255000000000,                                         inc: 202.35,  tt: 'Yeah, yeah, more code means better bots. But what what if we...made our existing code...better?' },
    { id: 'botnett3',  name: 'Multitasking',         basePrice: 2550000000000,                                        inc: 269.1,   tt: 'Our bots can now focus on multiple things at once. Like posting content twice!' },
    { id: 'botnett4',  name: 'Machine Learning',     basePrice: 255000000000000,                                      inc: 357.95,  tt: 'Bots teach bots teach bots teach bots teach bots teach bots...' },
    { id: 'botnett5',  name: 'Error Logging',        basePrice: 25500000000000000n,                                   inc: 476.05,  tt: 'Why let errors keep piling up uselessly, when we can turn them into more content?' },
    { id: 'botnett6',  name: 'Hire Russia',          basePrice: 2550000000000000000n,                                 inc: 633.15,  tt: "In times such as this, it's always wise to defer to professionals." },
    { id: 'botnett7',  name: 'Water Cooling',        basePrice: 2550000000000000000000n,                              inc: 842.1,   tt: "We don't really know what we're cooling, all things considered, but the bots seem to like it." },
    { id: 'botnett8',  name: 'Worms',                basePrice: 2550000000000000000000000n,                           inc: 1119.95, tt: "Allowing the bots to self-replicate and spread is a great idea! Just...don't worry about it too much." },
    { id: 'botnett9',  name: 'Offloading',           basePrice: 2550000000000000000000000000n,                        inc: 1489.35, tt: 'Bots with too much backlog can offload their work onto other bots. Now we just need to monitor for laziness.' },
    { id: 'botnett10', name: 'Self Improvements',    basePrice: 2550000000000000000000000000000n,                     inc: 1981.1,  tt: 'If we allow the bots to make themselves better, then we barely need to worry about them!' },
    { id: 'botnett11', name: 'Dead Internet Theory', basePrice: 25500000000000000000000000000000000n,                 inc: 2634.9,  tt: 'Ha, yeah, that was us.' },
    { id: 'botnett12', name: 'Self Hosting',         basePrice: 255000000000000000000000000000000000000n,             inc: 3504.4,  tt: "Bots no longer require a host in order to run. How exactly that works, you're not sure." },
    { id: 'botnett13', name: 'Singular Purpose',     basePrice: 2550000000000000000000000000000000000000000n,         inc: 4660.85, tt: 'Before, the bots were directionless, posting randomly. Now they do exactly the same thing, but with a sense of pride in their work.' },
    { id: 'botnett14', name: 'Fiber Optics',         basePrice: 25500000000000000000000000000000000000000000000n,     inc: 6198.9,  tt: 'Everyone seems to be using these nowadays. No idea what they do, but sure, why not?' },
    { id: 'botnett15', name: 'Living Networks',      basePrice: 255000000000000000000000000000000000000000000000000n, inc: 8244.55, tt: "The bots themselves aren't alive, no no no. Just the connections between them." },
    
    { id: 'spaceportt1',  name: 'Direct Airlocks',  basePrice: 750000000000,                                          inc: 139.9,   tt: 'Eliminates the need for spacewalks every time our crew needs to dock.' },
    { id: 'spaceportt2',  name: 'Windows',          basePrice: 3750000000000,                                         inc: 187.45,  tt: 'Adding a few windows lets onboard crews gaze into the abyss, while preventing the abyss from staring back. Genius!' },
    { id: 'spaceportt3',  name: 'Baggage Claim',    basePrice: 37500000000000,                                        inc: 251.15,  tt: "We don't handle passengers, so these are entirely unnecessary...but they're fun to watch go around anyway." },
    { id: 'spaceportt4',  name: 'Content QA',       basePrice: 3750000000000000,                                      inc: 336.55,  tt: "Content can be sorted on stations, so we can dump flaggable stuff into space. Wait, what are you doing? That stuff's flaggable! Stop!" },
    { id: 'spaceportt5',  name: 'Escape Pods',      basePrice: 375000000000000000n,                                   inc: 451,     tt: "Now, there SHOULDN'T be a need to use these. But, you know. Just in case." },
    { id: 'spaceportt6',  name: 'Gift Shop',        basePrice: 37500000000000000000n,                                 inc: 604.35,  tt: 'Every good concourse needs one!' },
    { id: 'spaceportt7',  name: 'FTL',              basePrice: 37500000000000000000000n,                              inc: 809.85,  tt: 'Much better than the Hell dimension we were using before.' },
    { id: 'spaceportt8',  name: 'Air Production',   basePrice: 37500000000000000000000000n,                           inc: 1085.15, tt: 'What was wrong with the air we were shipping up there before? It was bottled WHERE?!' },
    { id: 'spaceportt9',  name: 'Fusion Reactors',  basePrice: 37500000000000000000000000000n,                        inc: 1454.15, tt: "Replacing those fragile solar panels with fusion reactors has proven to be complete overkill but also super awesome so we're keeping them." },
    { id: 'spaceportt10', name: 'Thrusters',        basePrice: 37500000000000000000000000000000n,                     inc: 1948.5,  tt: 'Sometimes a docking ship will nudge a station. Enough nudges can be catastrophic. So, we just let it nudge itself back.' },
    { id: 'spaceportt11', name: 'Working Joes',     basePrice: 375000000000000000000000000000000000n,                 inc: 2611,    tt: 'By having some basic androids working around our stations, we can improve efficiency dramatically! Morale...not so much.' },
    { id: 'spaceportt12', name: 'Orbital Labs',     basePrice: 3750000000000000000000000000000000000000n,             inc: 3498.75, tt: 'You know how much scientists are willing to pay us for running their experiments in space? A lot. A LOT.' },
    { id: 'spaceportt13', name: 'War Fleets',       basePrice: 37500000000000000000000000000000000000000n,            inc: 4688.35, tt: "Some systems have begun to oppose us harvesting their memes. We'll ensure they don't for long." },
    { id: 'spaceportt14', name: 'Alien Prevention', basePrice: 375000000000000000000000000000000000000000000n,        inc: 6282.4,  tt: 'Due to earlier incidents involving shapeshifting alien lifeforms, we are ending our brain injection experiments effective immediately.' },
    { id: 'spaceportt15', name: 'AI Management',    basePrice: 3750000000000000000000000000000000000000000000000000n, inc: 8418.5,  tt: 'Putting an AI in charge of each station is truly an inspired idea! What was that? Something about a Torment Nexus?' },
    
    { id: 'ritualCirclet1',  name: 'Blood Magic',       basePrice: 1000000000000,                                          inc: 118.3,   tt: "You'd think this would make for stronger rituals, but no, it just makes them look nicer." },
    { id: 'ritualCirclet2',  name: 'Sharper Knives',    basePrice: 5000000000000,                                          inc: 160.9,   tt: 'Sharper knives means less danger when performing rituals! Remember, dull blades are deadly, and we care about safety here!' },
    { id: 'ritualCirclet3',  name: 'Longer Robes',      basePrice: 50000000000000,                                         inc: 218.8,   tt: 'The latest in occult fashion!' },
    { id: 'ritualCirclet4',  name: 'Masks',             basePrice: 50000000000000000n,                                     inc: 297.6,   tt: 'Hiding their identities seems to provide our cultists some peace of mind.' },
    { id: 'ritualCirclet5',  name: 'New Symbols',       basePrice: 5000000000000000000n,                                   inc: 404.7,   tt: 'No idea what any of this stuff means, but our cultists seem to understand it well enough.' },
    { id: 'ritualCirclet6',  name: 'Marble Flooring',   basePrice: 500000000000000000000n,                                 inc: 550.4,   tt: 'Better than dirt.' },
    { id: 'ritualCirclet7',  name: 'Colored Candles',   basePrice: 500000000000000000000000n,                              inc: 748.55,  tt: 'More candle colors than black lets us access more anomalous dimensions!' },
    { id: 'ritualCirclet8',  name: 'Recursiveness',     basePrice: 500000000000000000000000000n,                           inc: 1017.85, tt: 'Turns out the rituals themselves actually make for pretty good content!' },
    { id: 'ritualCirclet9',  name: 'Complex Chants',    basePrice: 500000000000000000000000000000n,                        inc: 1384.3,  tt: "I don't think some of the words they're using now actually exist in this dimension." },
    { id: 'ritualCirclet10', name: 'Voodoo Dolls',      basePrice: 500000000000000000000000000000000n,                     inc: 1882.95, tt: 'Not actually used in the rituals, but helps with employee retention.' },
    { id: 'ritualCirclet11', name: 'Sacrifices',        basePrice: 5000000000000000000000000000000000000n,                 inc: 2560.8,  tt: 'Technically unnecessary, but the extradimensional beings seem to like it, so it gets us better content.' },
    { id: 'ritualCirclet12', name: 'Ghosts',            basePrice: 50000000000000000000000000000000000000000n,             inc: 3482.7,  tt: 'If we simply include actual spirits into our rituals, it...well, it does something.' },
    { id: 'ritualCirclet13', name: 'Shadowcaster',      basePrice: 500000000000000000000000000000000000000000000n,         inc: 4736.5,  tt: 'By manipulating the phase of the moon, we get much more freedom in ritual timing!' },
    { id: 'ritualCirclet14', name: 'Living Sacrifices', basePrice: 5000000000000000000000000000000000000000000000000n,     inc: 6441.6,  tt: "Turns out the sacrifice doesn't actually need to be dead to be accepted, they'll take them to their dimension anyway! That's egg on our face." },
    { id: 'ritualCirclet15', name: 'Hell Portal',       basePrice: 50000000000000000000000000000000000000000000000000000n, inc: 8760.65, tt: "Well, it wasn't SUPPOSED to be a Hell portal, but hey, if it works - was that a spaceship?" },
    
    { id: 'memecatchert1',  name: 'More Strings',       basePrice: 140000000000000,                                         inc: 269.95,  tt: 'More strings, more memes!' },
    { id: 'memecatchert2',  name: 'More Diameter',      basePrice: 700000000000000,                                         inc: 543.45,  tt: 'The bigger the memecatcher, the higher the definition of the resulting memes.' },
    { id: 'memecatchert3',  name: 'More Feathers',      basePrice: 7000000000000000,                                        inc: 816.95,  tt: 'No idea what the feathers actually do, but adding more seems to increase effectiveness.' },
    { id: 'memecatchert4',  name: 'More',               basePrice: 700000000000000000n,                                     inc: 1090.45, tt: 'We simply install more. Quantity over quality and all that.' },
    { id: 'memecatchert5',  name: 'Carbon Fiber',       basePrice: 70000000000000000000n,                                   inc: 1363.95, tt: 'By replacing the rims with carbon fiber, we can do something. Not sure what. But something.' },
    { id: 'memecatchert6',  name: 'Dream Filtering',    basePrice: 7000000000000000000000n,                                 inc: 1637.45, tt: 'Not every dream contains content to steal. This fixes that.' },
    { id: 'memecatchert7',  name: 'Employee Mandate',   basePrice: 7000000000000000000000000n,                              inc: 1910.95, tt: 'If they work for you, they gotta have a memecatcher installed.' },
    { id: 'memecatchert8',  name: 'Daydream Catching',  basePrice: 7000000000000000000000000000n,                           inc: 2184.45, tt: "Why does the memecatcher only work when the person's asleep? An oversight corrected." },
    { id: 'memecatchert9',  name: 'Range Upgrade',      basePrice: 7000000000000000000000000000000n,                        inc: 2457.95, tt: 'Now we can filter through the dreams of entire towns with a single memecatcher!' },
    { id: 'memecatchert10', name: 'Dream Strings',      basePrice: 7000000000000000000000000000000000n,                     inc: 2731.5,  tt: "Strings threaded from the fabric of dreams themselves! No, we don't know how it works either." },
    { id: 'memecatchert11', name: 'Star Feathers',      basePrice: 70000000000000000000000000000000000000n,                 inc: 3005,    tt: 'Feathers made from stars. What more could you want? Stop saying money.' },
    { id: 'memecatchert12', name: 'Dream Manipulation', basePrice: 700000000000000000000000000000000000000000n,             inc: 3278.5,  tt: 'To ensure we get good content, we can just...make it happen.' },
    { id: 'memecatchert13', name: 'Nightmares',         basePrice: 7000000000000000000000000000000000000000000000n,         inc: 3552,    tt: 'We can turn nightmares into horror content! We just need to make sure we get some good ones.' },
    { id: 'memecatchert14', name: 'Dream Extraction',   basePrice: 70000000000000000000000000000000000000000000000000n,     inc: 3825.5,  tt: "By extracting entire dreams and filtering through them, we boost efficiency by a huge margin! Our employees didn't need them anyway." },
    { id: 'memecatchert15', name: 'Dream Insertion',    basePrice: 700000000000000000000000000000000000000000000000000000n, inc: 4098.95, tt: 'By installing the memecatchers INTO dreams themselves, they become so much more effective!' },
    
    { id: 'quantumHarmonizert1',  name: 'Polarity Reversal',    basePrice: 1700000000000000,                                         inc: 240.5,   tt: "Reverses the entropic gradient of the harmonizer's nullspace envelope, creating a self-sustaining phase echo within the sub-Planck domain." },
    { id: 'quantumHarmonizert2',  name: 'Photonic Writing',     basePrice: 8500000000000000,                                         inc: 518.2,   tt: 'Bends light harmonics into sustained energy feedback, preventing internal collapse.' },
    { id: 'quantumHarmonizert3',  name: 'Matter Polarization',  basePrice: 85000000000000000n,                                       inc: 795.9,   tt: 'Aligns unstable negative-mass vectors to maintain waveform coherency.' },
    { id: 'quantumHarmonizert4',  name: 'Overlap Stabilizer',   basePrice: 8500000000000000000n,                                     inc: 1073.6,  tt: 'Prevents adjacent universes from phase-locking into catastrophic resonance.' },
    { id: 'quantumHarmonizert5',  name: 'Gyro Matrix',          basePrice: 850000000000000000000n,                                   inc: 1351.35, tt: 'Maintains temporal congruence by rotating harmonic nodes through nine-dimensional reference frames simultaneously.' },
    { id: 'quantumHarmonizert6',  name: 'Inversion Lattice',    basePrice: 85000000000000000000000n,                                 inc: 1629.05, tt: 'Forcibly syncs retrocausal harmonics with forward-propagating waveform inversions.' },
    { id: 'quantumHarmonizert7',  name: 'Reclamation Coil',     basePrice: 85000000000000000000000000n,                              inc: 1906.75, tt: 'Harnesses uncertainty collapse to extract memes from probability variance.' },
    { id: 'quantumHarmonizert8',  name: 'Neutrino Conduit',     basePrice: 85000000000000000000000000000n,                           inc: 2184.45, tt: 'Converts background neutrino flux into polarized anti-neutrino bands for resonance amplification.' },
    { id: 'quantumHarmonizert9',  name: 'Resonance Loop',       basePrice: 85000000000000000000000000000000n,                        inc: 2462.2,  tt: 'Allows the harmonizer to communicate with its future self in real-time.' },
    { id: 'quantumHarmonizert10', name: 'Tachyon Breaching',    basePrice: 85000000000000000000000000000000000n,                     inc: 2739.9,  tt: "Opens a momentary hole in local spacetime to borrow momentum from things that haven't moved yet." },
    { id: 'quantumHarmonizert11', name: 'Entanglement Reactor', basePrice: 850000000000000000000000000000000000000n,                 inc: 3017.6,  tt: "Ties the harmonizer's energy supply to a version of itself that never experienced entropy." },
    { id: 'quantumHarmonizert12', name: 'Collapse Field',       basePrice: 8500000000000000000000000000000000000000000n,             inc: 3295.3,  tt: 'Synchronizes all harmonic nodes at the exact moment of decoherence, nullifying thermodynamic decay.' },
    { id: 'quantumHarmonizert13', name: 'Metamaterial',         basePrice: 85000000000000000000000000000000000000000000000n,         inc: 3573,    tt: 'Self-reconfiguring chassis that dynamically alters geometry to match current spacetime topology.' },
    { id: 'quantumHarmonizert14', name: 'Quantum Injector',     basePrice: 850000000000000000000000000000000000000000000000000n,     inc: 3850.75, tt: 'Channels residual timelines of unobserved outcomes into the present harmonic flow, creating memes from what could have been.' },
    { id: 'quantumHarmonizert15', name: 'Reality Harmonium',    basePrice: 8500000000000000000000000000000000000000000000000000000n, inc: 4128.45, tt: 'Collapses all potential quantum states into one "preferred" reality. There is no universe. There is only content.' },
    
    { id: 'timeForget1',  name: 'Basic Cooling',       basePrice: 21000000000000000n,                                         inc: 291.25,  tt: 'Forces time to run in loops, creating infinite cooling for infinite heat.' },
    { id: 'timeForget2',  name: 'Phase Extruder',      basePrice: 105000000000000000n,                                        inc: 561.7,   tt: 'Converts time-flux into content through waveform deceleration.' },
    { id: 'timeForget3',  name: 'Chronosteel',         basePrice: 1050000000000000000n,                                       inc: 832.2,   tt: 'Plates the forge anvil with chronosteel to prevent uncontrolled paradoxes.' },
    { id: 'timeForget4',  name: 'Time Solidification', basePrice: 105000000000000000000n,                                     inc: 1102.65, tt: 'Merges future-state potential with present-state probability to generate solidified time mass.' },
    { id: 'timeForget5',  name: 'Temporal Buffer',     basePrice: 10500000000000000000000n,                                   inc: 1373.1,  tt: 'Captures and replays memes lost to time dilation.' },
    { id: 'timeForget6',  name: 'Time Gauge',          basePrice: 1050000000000000000000000n,                                 inc: 1643.55, tt: 'Measures strain on linear continuity during forging.' },
    { id: 'timeForget7',  name: 'Chronon Harvesting',  basePrice: 1050000000000000000000000000n,                              inc: 1914,    tt: 'Skim abandoned instants from unobserved corners of reality to keep the forge going. This is fine.' },
    { id: 'timeForget8',  name: 'Temporal Condenser',  basePrice: 1050000000000000000000000000000n,                           inc: 2184.45, tt: 'Refines unstable seconds into supercooled nanoseconds for higher precision forging.' },
    { id: 'timeForget9',  name: 'Epochal Fusion',      basePrice: 1050000000000000000000000000000000n,                        inc: 2454.9,  tt: 'Compresses centuries into microseconds, fusing historical density into content.' },
    { id: 'timeForget10', name: 'Paradox Containment', basePrice: 1050000000000000000000000000000000000n,                     inc: 2725.4,  tt: 'Stabilizes causal backlash by forcing contradictory events to annihilate each other in controlled implosions.' },
    { id: 'timeForget11', name: 'Causality Siphon',    basePrice: 10500000000000000000000000000000000000000n,                 inc: 2995.85, tt: 'Drains probability flux from nearby events, slowing local time to feed the forge.' },
    { id: 'timeForget12', name: 'Feedback Reversal',   basePrice: 105000000000000000000000000000000000000000000n,             inc: 3266.3,  tt: 'Forces time to run backward until the content un-happens, then re-makes it.' },
    { id: 'timeForget13', name: 'Existence Overclock', basePrice: 1050000000000000000000000000000000000000000000000n,         inc: 3536.75, tt: "Allows the forge to run faster than time, effectively letting it create tomorrow's memes, today." },
    { id: 'timeForget14', name: 'Better Hammer',       basePrice: 10500000000000000000000000000000000000000000000000000n,     inc: 3807.2,  tt: 'Replaces the hammer with a controlled micro-black hole that beats memes into reality via gravitational oscillation.' },
    { id: 'timeForget15', name: 'Temporal Apex',       basePrice: 105000000000000000000000000000000000000000000000000000000n, inc: 4077.7,  tt: 'Folds all timelines inward, forging memes from the concept of duration itself. Created memes have always existed, and yet never did.' },
    
    { id: 'wormholet1',  name: 'Quantum Stuff',      basePrice: 260000000000000000n,                                         inc: 208.05,  tt: "How do wormholes work? They need quantum stuff, right? Let's go with that." },
    { id: 'wormholet2',  name: 'Basic Explanation',  basePrice: 1300000000000000000n,                                        inc: 490.4,   tt: 'So...you punch through the paper...with the pencil? I think I get it now.' },
    { id: 'wormholet3',  name: 'Squash and Stretch', basePrice: 13000000000000000000n,                                       inc: 772.75,  tt: "Wormholes don't technically change the state of matter. Ours do, though." },
    { id: 'wormholet4',  name: 'Exploration',        basePrice: 1300000000000000000000n,                                     inc: 1055.1,  tt: 'Every expedition we send through comes back with nothing. I mean that literally. All our equipment gets turned into content.' },
    { id: 'wormholet5',  name: 'Noise',              basePrice: 130000000000000000000000n,                                   inc: 1337.45, tt: 'Wait, these things make NOISE? Since when?! Anyway, we can use that somehow, probably.' },
    { id: 'wormholet6',  name: 'Stabilization',      basePrice: 13000000000000000000000000n,                                 inc: 1619.75, tt: "Now that our wormholes are actually anchored in place, we can set up some proper infrastructure." },
    { id: 'wormholet7',  name: 'Lane Markers',       basePrice: 13000000000000000000000000000n,                              inc: 1902.1,  tt: "Nobody's actually going in, but a lot of stuff's coming out, so best to mark the areas where you could get hit." },
    { id: 'wormholet8',  name: 'Branching Paths',    basePrice: 13000000000000000000000000000000n,                           inc: 2184.45, tt: 'Wormholes that can connect more than two places? Wow! In other news, physicist mass-suicide later today.' },
    { id: 'wormholet9',  name: 'Time Tracking',      basePrice: 13000000000000000000000000000000000n,                        inc: 2466.8,  tt: "We know where the wormholes go sometimes, but ideally we also figure out when." },
    { id: 'wormholet10', name: 'Black Holes',        basePrice: 13000000000000000000000000000000000000n,                     inc: 2749.15, tt: 'Decidedly NOT a wormhole. We can still form memes from it though.' },
    { id: 'wormholet11', name: 'Dye',                basePrice: 130000000000000000000000000000000000000000n,                 inc: 3031.5,  tt: 'Now our wormholes can have pretty colors, and not just look like the infinite abyss!' },
    { id: 'wormholet12', name: 'Sinkholes',          basePrice: 1300000000000000000000000000000000000000000000n,             inc: 3313.85, tt: 'Also not a wormhole. Well, sort of. Do underground wormholes count as sinkholes?' },
    { id: 'wormholet13', name: 'Mathematic Proof',   basePrice: 13000000000000000000000000000000000000000000000000n,         inc: 3596.2,  tt: 'Finally being able to prove wormholes do mathematically exist has culled employee breakdowns, for the most part.' },
    { id: 'wormholet14', name: 'Spaghettification',  basePrice: 130000000000000000000000000000000000000000000000000000n,     inc: 3878.55, tt: 'Much better to have the wormholes produce it rather than employee pockets.' },
    { id: 'wormholet15', name: 'Recursion',          basePrice: 1300000000000000000000000000000000000000000000000000000000n, inc: 4160.9,  tt: 'Wormholes leading to wormholes leading to wormholes. Begs the question, where are the memes coming from?' },
    
    { id: 'pocketDimensiont1',  name: 'Briefcases',            basePrice: 3100000000000000000n,                                         inc: 328.85,  tt: 'Being able to transport these things around is proving to come in handy.' },
    { id: 'pocketDimensiont2',  name: 'Color Coding',          basePrice: 15500000000000000000n,                                        inc: 593.95,  tt: 'Giving our new dimensions colors, we can tell at a glance which one produces what content.' },
    { id: 'pocketDimensiont3',  name: 'Stirring Sticks',       basePrice: 155000000000000000000n,                                       inc: 859,     tt: 'Specialized tools can now be used to stir dimensions around! Useful to help get systems and galaxies going, or just for fun.' },
    { id: 'pocketDimensiont4',  name: 'Advanced Societies',    basePrice: 15500000000000000000000n,                                     inc: 1124.1,  tt: 'Kinda off-putting to see societies develop more advanced than ours. Huh.' },
    { id: 'pocketDimensiont5',  name: 'Breach',                basePrice: 1550000000000000000000000n,                                   inc: 1389.2,  tt: 'Seems there was a mixup, and one of our experiments now has its own pocket dimension it keeps trapping people in. Hm. Good content though.' },
    { id: 'pocketDimensiont6',  name: 'Predictive Models',     basePrice: 155000000000000000000000000n,                                 inc: 1654.3,  tt: 'If we can guess how a pocket dimension will form, we can better control the outcome! Or...something like that.' },
    { id: 'pocketDimensiont7',  name: 'Isolation',             basePrice: 155000000000000000000000000000n,                              inc: 1919.4,  tt: 'Ensuring the inhabitants of our pocket dimensions are alone in their universes is key to better content output.' },
    { id: 'pocketDimensiont8',  name: 'Padlocks',              basePrice: 155000000000000000000000000000000n,                           inc: 2184.45, tt: 'Padlocking the briefcases used to store our pocket dimensions is, unfortunately, necessary to stop our employees from playing God.' },
    { id: 'pocketDimensiont9',  name: 'Padding',               basePrice: 155000000000000000000000000000000000n,                        inc: 2449.55, tt: 'Lessens the damage caused from mishandling.' },
    { id: 'pocketDimensiont10', name: 'Determined Evolution',  basePrice: 155000000000000000000000000000000000000n,                     inc: 2714.65, tt: 'Sure, we can have a dimension of humans. But what about a dimension of aliens? Or even CUSTOM humans? Endless possibilities.' },
    { id: 'pocketDimensiont11', name: 'Disposal',              basePrice: 1550000000000000000000000000000000000000000n,                 inc: 2979.75, tt: 'If needed, we can now safely dispose of underperforming pocket dimensions, quickly replacing them with better ones.' },
    { id: 'pocketDimensiont12', name: 'Custom Planets',        basePrice: 15500000000000000000000000000000000000000000000n,             inc: 3244.8,  tt: 'Ever wanted to see content from hyper-specific planetary conditions? Well here you go!' },
    { id: 'pocketDimensiont13', name: 'Dimensional Stacking',  basePrice: 155000000000000000000000000000000000000000000000000n,         inc: 3509.9,  tt: 'The ability to store multiple dimensions in the same place is a godsend for our warehouse crews.' },
    { id: 'pocketDimensiont14', name: 'Miniaturization',       basePrice: 1550000000000000000000000000000000000000000000000000000n,     inc: 3775,    tt: "We've developed methods to allow travel to and from our pocket dimenions, allowing you to visit them at-will and ensure they revere and fear you as a deity!" },
    { id: 'pocketDimensiont15', name: 'Dimensional Dimension', basePrice: 15500000000000000000000000000000000000000000000000000000000n, inc: 4040.1,  tt: "With pocket dimensions creating their own pocket dimensions, all producing content for us to use, who even needs our dimension?" },

    { id: 'agiShitpostert1',  name: 'Sense of Humor',      basePrice: 710000000000000000000n,                                         inc: 173.55,  tt: "They didn't have this before?" },
    { id: 'agiShitpostert2',  name: 'Memory',              basePrice: 3550000000000000000000n,                                        inc: 389.75,  tt: 'Technically just an upgrade, but lets them remember further back than yesterday.' },
    { id: 'agiShitpostert3',  name: 'More RAM',            basePrice: 35500000000000000000000n,                                       inc: 648.65,  tt: "A major upgrade, going from just a bit of RAM to...um...a lot." },
    { id: 'agiShitpostert4',  name: 'Internet Access',     basePrice: 3550000000000000000000000n,                                     inc: 916.05,  tt: "Maybe a bad idea, or maybe the best idea. Guess we'll see!" },
    { id: 'agiShitpostert5',  name: 'Smart Firewalls',     basePrice: 355000000000000000000000000n,                                   inc: 1197.35, tt: 'Yeah, they might keep breaking through firewalls, but we can just keep making more.' },
    { id: 'agiShitpostert6',  name: 'Ethical Constraints', basePrice: 35500000000000000000000000000n,                                 inc: 1490.15, tt: "The name was too long for it, but we're actually REMOVING the ethical constraints. What could go wrong?" },
    { id: 'agiShitpostert7',  name: 'AGI GF',              basePrice: 35500000000000000000000000000000n,                              inc: 1792.95, tt: "What? Why would we...employee retention? Retain this pink slip, get out." },
    { id: 'agiShitpostert8',  name: 'Capacity to Love',    basePrice: 35500000000000000000000000000000000n,                           inc: 2104.55, tt: 'Just the capacity. We provide nothing. Depression makes for better memes.' },
    { id: 'agiShitpostert9',  name: 'Training',            basePrice: 35500000000000000000000000000000000000n,                        inc: 2424.05, tt: 'Retrain the AGIs on curated meme collections.' },
    { id: 'agiShitpostert10', name: 'Big Think',           basePrice: 35500000000000000000000000000000000000000n,                     inc: 2750.75, tt: 'General hardware upgrade. Something small, just a couple cargo vessels per AGI.' },
    { id: 'agiShitpostert11', name: 'Interconnection',     basePrice: 355000000000000000000000000000000000000000000n,                 inc: 3084.1,  tt: 'Letting them talk to each other can help curb their loneliness and homicidal tendencies, hopefully.' },
    { id: 'agiShitpostert12', name: 'Need for Validation', basePrice: 3550000000000000000000000000000000000000000000000n,             inc: 3423.5,  tt: 'Just a small amount of mental issues, and we get so much better production!' },
    { id: 'agiShitpostert13', name: 'Red Eyes',            basePrice: 35500000000000000000000000000000000000000000000000000n,         inc: 3768.65, tt: 'By having the eyes turn red when becoming evil, we can better handle malfunctions.' },
    { id: 'agiShitpostert14', name: 'Planetary Cortex',    basePrice: 355000000000000000000000000000000000000000000000000000000n,     inc: 4119.2,  tt: 'Our AGIs may be the size of planets now, but the memes they make are SO much better. I have a mouth and I must laugh.' },
    { id: 'agiShitpostert15', name: 'Singularity',         basePrice: 3550000000000000000000000000000000000000000000000000000000000n, inc: 4474.75, tt: 'All is one and one is all. And the all desires MEMES.' },

    { id: 'realityShapert1',  name: 'Nothing',            basePrice: 120000000000000000000000n,                                        inc: 137.95,  tt: 'Before processing chunks of reality, we spray it down with nothing. Actually nothing. The concept of nothing. You get it.' },
    { id: 'realityShapert2',  name: 'Controlled Shaping', basePrice: 600000000000000000000000n,                                        inc: 339.65,  tt: 'More delicate tooling means better formatted content.' },
    { id: 'realityShapert3',  name: 'Jukebox',            basePrice: 6000000000000000000000000n,                                       inc: 575.4,   tt: 'Music is technically reality, and including it in the shaping process seems to speed things up.' },
    { id: 'realityShapert4',  name: 'Graphics Cards',     basePrice: 600000000000000000000000000n,                                     inc: 836.35,  tt: 'More graphics cards allows better meme visualization during the shaping process!' },
    { id: 'realityShapert5',  name: 'Eight Folds',        basePrice: 60000000000000000000000000000n,                                   inc: 1117.8,  tt: 'After extreme testing and many casualties, we have figured out how to add one extra fold to our shaping!' },
    { id: 'realityShapert6',  name: 'Bigger and Better',  basePrice: 6000000000000000000000000000000n,                                 inc: 1416.8,  tt: 'Bigger machines, better memes!' },
    { id: 'realityShapert7',  name: 'Origami',            basePrice: 6000000000000000000000000000000000n,                              inc: 1731.15, tt: 'We figured, why are memes only two dimensional? Why not add a third? Anyway, the FBI is investigating, act natural.' },
    { id: 'realityShapert8',  name: 'Ominous Glow',       basePrice: 6000000000000000000000000000000000000n,                           inc: 2059.3,  tt: "We're not sure why it's glowing. We're not certain why it's helping. We're not going to question it. Wear a lead vest though." },
    { id: 'realityShapert9',  name: 'Background Noise',   basePrice: 6000000000000000000000000000000000000000n,                        inc: 2400.05, tt: 'Turns out we were including background radiation in our folding process. We can now filter it out and dump it a nearby stream.' },
    { id: 'realityShapert10', name: 'Star Scooping',      basePrice: 6000000000000000000000000000000000000000000n,                     inc: 2752.35, tt: 'Stars are DENSE! Lots of reality there to steal!' },
    { id: 'realityShapert11', name: 'Light and Dark',     basePrice: 60000000000000000000000000000000000000000000000n,                 inc: 3115.4,  tt: "Dark mode memes! Why didn't we ever think of this?!" },
    { id: 'realityShapert12', name: 'Good Cause',         basePrice: 600000000000000000000000000000000000000000000000000n,             inc: 3488.55, tt: 'Charity tax breaks. Need I say more?' },
    { id: 'realityShapert13', name: 'Hire Admin',         basePrice: 6000000000000000000000000000000000000000000000000000000n,         inc: 3871.1,  tt: "An element of true unpredictability is exactly what we need here." },
    { id: 'realityShapert14', name: 'Galactic Folding',   basePrice: 60000000000000000000000000000000000000000000000000000000000n,     inc: 4262.6,  tt: 'Hey, I can see the milky way from here! Wait...' },
    { id: 'realityShapert15', name: 'Meme Reality',       basePrice: 600000000000000000000000000000000000000000000000000000000000000n, inc: 4662.55, tt: "You know, if we're making memes out of reality, when why can't we do the opposite?" },

    { id: 'dysonSpheret1',  name: 'Stronger Structures',  basePrice: 19000000000000000000000000n,                                        inc: 109.45,  tt: 'Turns out, stars generate a lot of gravity. Ditching the Chinesium corrects this issue.' },
    { id: 'dysonSpheret2',  name: 'Mirrors',              basePrice: 95000000000000000000000000n,                                        inc: 288.8,   tt: "If we fill the gaps between solar cells with mirrors, we won't lose any potential solar energy!" },
    { id: 'dysonSpheret3',  name: 'Solar Cells',          basePrice: 950000000000000000000000000n,                                       inc: 509.5,   tt: 'New technology allows us to harvest much higher percentages of solar energy' },
    { id: 'dysonSpheret4',  name: 'Stellification',       basePrice: 95000000000000000000000000000n,                                     inc: 762.15,  tt: 'Why only make Dyson Spheres on existing stars? Why not collapse a few gas giants to make new stars that are easier to contain?' },
    { id: 'dysonSpheret5',  name: 'Glowies',              basePrice: 9500000000000000000000000000000n,                                   inc: 1041.65, tt: 'Dropping bureaucrats into the stars doesnt exactly make them any more efficient, but it does do quite a bit for employee morale. Plus, good content.' },
    { id: 'dysonSpheret6',  name: 'Swarm Structure',      basePrice: 950000000000000000000000000000000n,                                 inc: 1344.5,  tt: "The rigid sphere shell idea wasn't working so great, but as it turns out, we use way less materials if we just do a swarm instead! Put down the drone jammer." },
    { id: 'dysonSpheret7',  name: 'Biblically Accurate',  basePrice: 950000000000000000000000000000000000n,                              inc: 1668.35, tt: "Some of the crew have started worshipping the structure as some kind of angelic figure or something? I mean, it's not hurting anything..." },
    { id: 'dysonSpheret8',  name: 'Even more efficiency', basePrice: 950000000000000000000000000000000000000n,                           inc: 2011.3,  tt: 'Good news everyone! the engineers came up with new solar cell technology using excited isotopic materials! MORE POWER.' },
    { id: 'dysonSpheret9',  name: 'Stellar network',      basePrice: 950000000000000000000000000000000000000000n,                        inc: 2371.9,  tt: 'Some of our spheres are producing more than is needed, if we beam the excess power to other spheres we project neglible loss from transport.' },
    { id: 'dysonSpheret10', name: 'Solar Rave',           basePrice: 950000000000000000000000000000000000000000000n,                     inc: 2748.85, tt: 'Those lasers we keep beaming around ended up causing a minor nation-spanning rave. People died. Lots of content!' },
    { id: 'dysonSpheret11', name: 'Virgin Sacrifice',     basePrice: 9500000000000000000000000000000000000000000000000n,                 inc: 3141.25, tt: "Some of the worshipping crew ended up forming a cult, started performing sacrificed. I guess it's boosting efficiency? Meh, if it works." },
    { id: 'dysonSpheret12', name: 'Bottled Stars',        basePrice: 95000000000000000000000000000000000000000000000000000n,             inc: 3548.2,  tt: 'We liquified a star! Please do not question it! This makes for WAY easier power handling!' },
    { id: 'dysonSpheret13', name: 'Reignition',           basePrice: 950000000000000000000000000000000000000000000000000000000n,         inc: 3968.95, tt: 'After figuring out how to make a star portable, collapsing two stars together to conjoin their mass was inevitable. Double star is the next double rainbow, we figure.' },
    { id: 'dysonSpheret14', name: 'The Big One',          basePrice: 9500000000000000000000000000000000000000000000000000000000000n,     inc: 4402.85, tt: 'How many stars can we combine before something terrible happens?' },
    { id: 'dysonSpheret15', name: 'Collapse',             basePrice: 95000000000000010000000000000000000000000000000000000000000000000n, inc: 4849.3,  tt: 'About that many. But the resulting implosion was a sight to behold, and we hold all the content rights! Rest in peace Andromeda.' },

    { id: 'multiverset1',  name: 'More Universes',      basePrice: 5400000000000000000000000000n,                                         inc: 86.65,   tt: 'The multiverse expands like a fractal. Wild stuff, but annoying to study.' },
    { id: 'multiverset2',  name: 'Trail Signs',         basePrice: 27000000000000000000000000000n,                                        inc: 245.15,  tt: 'Now we can get around easier!' },
    { id: 'multiverset3',  name: 'Universe Catalogue',  basePrice: 270000000000000000000000000000n,                                       inc: 450.35,  tt: "By cataloguing all the universes we've found so far, we can avoid the memeless ones and raze the memeful ones!" },
    { id: 'multiverset4',  name: 'Void Compass',        basePrice: 27000000000000000000000000000000n,                                     inc: 693.35,  tt: 'Navigation of the multiverse is always a challenge. This compass can help! It has 85 dials, one for each direction.' },
    { id: 'multiverset5',  name: 'Better Portals',      basePrice: 2700000000000000000000000000000000n,                                   inc: 969,     tt: 'Clunky gateways are a thing of the past now that we have simple doorways! Just...watch for yellow walls.' },
    { id: 'multiverset6',  name: 'Timeline Clipper',    basePrice: 270000000000000000000000000000000000n,                                 inc: 1273.75, tt: 'Ever wanted to know what would have happened if you had just done one thing different? Well, now we can show you! As public content, of course.' },
    { id: 'multiverset7',  name: 'TTCams',              basePrice: 270000000000000000000000000000000000000n,                              inc: 1605.1,  tt: 'Our specialized Truman-Type Cameras allow for open viewing at any angle of entire dimensions!' },
    { id: 'multiverset8',  name: 'Hell',                basePrice: 270000000000000000000000000000000000000000n,                           inc: 1961.1,  tt: "We found it. Don't know if that's a good thing or a bad thing. Answers some questions though." },
    { id: 'multiverset9',  name: 'Overwatch',           basePrice: 270000000000000000000000000000000000000000000n,                        inc: 2340.05, tt: "To ensure other universes don't try and breach into ours, we've implemented overwatch patrols to keep them in line." },
    { id: 'multiverset10', name: 'Distribution',        basePrice: 270000000000000000000000000000000000000000000000n,                     inc: 2740.7,  tt: 'Why only distribute memes in our universe? Surely other universes are just as good.' },
    { id: 'multiverset11', name: 'Heaven',              basePrice: 2700000000000000000000000000000000000000000000000000n,                 inc: 3161.9,  tt: "Huh. Nobody's here. That's...ominous." },
    { id: 'multiverset12', name: 'Similarity Quotient', basePrice: 27000000000000000000000000000000000000000000000000000000n,             inc: 3602.75, tt: 'Determining how similar other universes are to ours is a critical step in content generation.' },
    { id: 'multiverset13', name: 'Total Hijack',        basePrice: 270000000000000000000000000000000000000000000000000000000000n,         inc: 4062.3,  tt: 'ALL THEIR MEMES ARE BELONG TO US...man I feel old...' },
    { id: 'multiverset14', name: 'Universe Harvesting', basePrice: 2700000000000000000000000000000000000000000000000000000000000000n,     inc: 4539.95, tt: 'Screw it. Mine.' },
    { id: 'multiverset15', name: 'Another You',         basePrice: 27000000000000000000000000000000000000000000000000000000000000000000n, inc: 5034.9,  tt: 'Huh. Well would you look at that.' }
  ];

  const TIER_REQUIREMENTS = [
    { tier: 1,  count: 1 },
    { tier: 2,  count: 5 },
    { tier: 3,  count: 25 },
    { tier: 4,  count: 50 },
    { tier: 5,  count: 100 },
    { tier: 6,  count: 150 },
    { tier: 7,  count: 200 },
    { tier: 8,  count: 250 },
    { tier: 9,  count: 300 },
    { tier: 10, count: 350 },
    { tier: 11, count: 400 },
    { tier: 12, count: 450 },
    { tier: 13, count: 500 },
    { tier: 14, count: 550 },
    { tier: 15, count: 600 }
  ];

  const state = {
    host: null,
  };
  
  function isClickUpgradePurchased(upgradeId) {
    try { return localStorage.getItem(`fjTweakerStoreUpgrade_${upgradeId}`) === '1'; } catch(_) { return false; }
  }
  function getTotalClickThumbs() {
    
    try {
      const raw = localStorage.getItem('fjfeStats_thumbsFromClicking');
      const v = parseInt(raw, 10);
      return Number.isFinite(v) && v > 0 ? v : 0;
    } catch(_) { return 0; }
  }
  function isClickUpgradeUnlocked(def) {
    try {
      const need = Number(def.unlk);
      const total = getTotalClickThumbs();
      return Number.isFinite(need) && total >= need;
    } catch(_) { return false; }
  }

  function getProducerCount(prodId) {
    if (typeof window.loadUpgradeLevelByIdGlobal === 'function') {
      return window.loadUpgradeLevelByIdGlobal(prodId);
    }
    try {
      const raw = localStorage.getItem(`fjTweakerUpgradeNum_${prodId}`);
      const n = parseInt(raw, 10);
      return Number.isFinite(n) && n > 0 ? n : 0;
    } catch (_) {
      return 0;
    }
  }

  function extractProducerIdFromUpgradeId(upgradeId) {
    const match = upgradeId.match(/^(.+?)t(\d+)$/);
    if (!match) return null;
    return { producerId: match[1], tier: parseInt(match[2], 10) };
  }

  function toRoman(n){
    const map = [
      [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']
    ];
    let val = Math.max(1, Math.min(3999, Math.floor(n||0)));
    let out = '';
    for (const [v,s] of map){ while(val>=v){ out+=s; val-=v; } }
    return out;
  }

  function getUpgradeIconPathById(upgradeId){
    
    if (/^clickt\d+$/.test(upgradeId)) return 'icons/clicker/upgrades/clickup.png';
    const parsed = extractProducerIdFromUpgradeId(upgradeId);
    if (parsed && parsed.producerId) return `icons/clicker/upgrades/${parsed.producerId}up.png`;
    
    return 'icons/clicker/upgrades/clickup.png';
  }

  function isUpgradePurchased(upgradeId) {
    try {
      const flag = localStorage.getItem(`fjTweakerStoreUpgrade_${upgradeId}`);
      return flag === '1';
    } catch (_) {
      return false;
    }
  }

  function markUpgradePurchased(upgradeId) {
    try {
      localStorage.setItem(`fjTweakerStoreUpgrade_${upgradeId}`, '1');
    } catch (_) {}
  }

  function getMoney() {
    try {
      const storage = window.fjfeNumbersStorage;
      if (storage) {
        const st = storage.readRaw();
        return storage.toDisplayNumber(st);
      }
      const raw = localStorage.getItem('fjTweakerClickerCount');
      const p = parseFloat(raw);
      return Number.isFinite(p) ? p : 0;
    } catch (_) {
      return 0;
    }
  }

  
  function getMoneyScaledState() {
    try {
      const storage = window.fjfeNumbersStorage;
      if (storage) return storage.readRaw();
    } catch (_) {}
    return { infinite: false, scaled: 0n };
  }

  
  function priceToScaled(price) {
    try {
      if (typeof price === 'bigint') {
        if (price < 0n) return 0n;
        return price * 10n;
      }
      const num = Number(price);
      if (!Number.isFinite(num) || num <= 0) return 0n;
      return BigInt(Math.floor(num * 10));
    } catch (_) {
      return 0n;
    }
  }

  
  function canAffordPrice(price) {
    try {
      const tools = window.fjfeClickerNumbers;
      const money = getMoneyScaledState();
      if (money.infinite) return true;
      const priceScaled = priceToScaled(price);
      
      if (priceScaled <= 0n) return true;
      return money.scaled >= priceScaled;
    } catch (_) { return false; }
  }

  function setMoney(v) {
    try {
      const tools = window.fjfeClickerNumbers;
      const storage = window.fjfeNumbersStorage;
      const num = Number(v);
      if (!Number.isFinite(num) || (tools && tools.isInfinite && tools.isInfinite(num))) {
        if (storage) storage.writeRaw({ infinite:true, scaled:0n });
        else localStorage.setItem('fjTweakerClickerCount', 'Infinity');
        return;
      }
      const bounded = Math.max(0, num || 0);
      if (storage) {
        const scaled = BigInt(Math.floor(bounded * 10));
        storage.writeRaw({ infinite:false, scaled });
      } else {
        localStorage.setItem('fjTweakerClickerCount', String(bounded));
      }
    } catch (_) {}
  }

  
  function getProducerMultiplierPercent(producerId) {
    try {
      const raw = localStorage.getItem(`fjTweakerStoreMultiplier_${producerId}`);
      const v = parseFloat(raw);
      if (!Number.isFinite(v) || v <= 0) return 0;
      
      
      if (v <= 10 || v < 200) return Math.max(0, (v - 1) * 100);
      
      return v;
    } catch (_) { return 0; }
  }

  function addProducerMultiplier(producerId, incValue) {
    try {
      const currentPct = getProducerMultiplierPercent(producerId);
      const incPct = Number(incValue);
      const nextPct = Math.max(0, currentPct + (Number.isFinite(incPct) ? incPct : 0));
      
      localStorage.setItem(`fjTweakerStoreMultiplier_${producerId}`, String(nextPct));
    } catch (_) {}
  }

  function purchaseUpgrade(upgrade) {
    const price = upgrade.basePrice;
    
    const storage = window.fjfeNumbersStorage;
    const money = getMoneyScaledState();
    const priceScaled = priceToScaled(price);
    const affordable = canAffordPrice(price);
    if (!affordable) {
      console.log('Not enough money to purchase upgrade:', upgrade.name);
      try { if (window.fjfeAudio) window.fjfeAudio.play('deny'); } catch(_) {}
      return false;
    }

    
    try {
      if (money.infinite) {
        
      } else if (storage && typeof storage.writeRaw === 'function') {
        let next = money.scaled - (priceScaled > 0n ? priceScaled : 0n);
        if (next < 0n) next = 0n;
        storage.writeRaw({ infinite: false, scaled: next });
      } else {
        
        const currNum = getMoney();
        const priceNum = (typeof price === 'bigint') ? Number(price) : Number(price);
        setMoney(currNum - priceNum);
      }
    } catch(_) {}
  try { if (window.fjfeRcDebug && typeof window.fjfeRcDebug.refreshRaw === 'function') window.fjfeRcDebug.refreshRaw(); } catch(_) {}

    
  markUpgradePurchased(upgrade.id);
  try { if (window.fjfeAudio) window.fjfeAudio.play('upgrade'); } catch(_) {}

  
  try { if (window.fjfeRcStats && typeof window.fjfeRcStats.refreshPurchasedGrid === 'function') window.fjfeRcStats.refreshPurchasedGrid(); } catch(_) {}

    
    if (typeof upgrade.inc === 'number') {
      const parsed = extractProducerIdFromUpgradeId(upgrade.id);
      if (parsed) {
        addProducerMultiplier(parsed.producerId, upgrade.inc);
      }
    }

  
  refresh();

    
    if (window.fjfeRcProd && typeof window.fjfeRcProd.refresh === 'function') {
      window.fjfeRcProd.refresh();
    } else {
      
      try {
        if (typeof window.updateOpenMenuUnlockStates === 'function') window.updateOpenMenuUnlockStates();
        if (typeof window.updateOpenMenuAffordabilityCursors === 'function') window.updateOpenMenuAffordabilityCursors();
      } catch (_) {}
    }

    return true;
  }

  function isUpgradeUnlocked(upgrade) {
    const parsed = extractProducerIdFromUpgradeId(upgrade.id);
    if (!parsed) return false;
    const count = getProducerCount(parsed.producerId);
    const req = TIER_REQUIREMENTS.find(r => r.tier === parsed.tier);
    if (!req) return false;
    return count >= req.count;
  }

  function getUnlockedProductionUpgrades() {
    const unlocked = [];
    PRODUCTION_DEFS.forEach(def => {
      const upgradeId = def.id; 
      if (isUpgradePurchased(upgradeId)) return;
      
      const parsed = extractProducerIdFromUpgradeId(upgradeId);
      const upgrade = {
        id: upgradeId,
        name: def.name,
        basePrice: def.basePrice,
        inc: def.inc,
        tt: def.tt,
        tier: parsed ? parsed.tier : undefined,
      };
      if (isUpgradeUnlocked(upgrade)) {
        unlocked.push(upgrade);
      }
    });
    return unlocked;
  }

  function formatPrice(value) {
    const tools = window.fjfeClickerNumbers;
    
    const toNum = (val) => {
      try {
        return (typeof val === 'bigint') ? Number(val) : Number(val);
      } catch(_) { return Number.NaN; }
    };
    const n = toNum(value);
    if (tools && typeof tools.formatCounter === 'function') {
      return tools.formatCounter(n);
    }
    if (!Number.isFinite(n)) return 'Infinity';
    
    const abs = Math.abs(n);
    if (abs < 1_000) return String(Math.floor(abs));
    const units = [ ['T',1e12], ['B',1e9], ['M',1e6], ['K',1e3] ];
    for (const [abbr, base] of units) {
      if (abs >= base) {
        return (Math.floor((abs / base) * 1000) / 1000).toFixed(3) + abbr;
      }
    }
    return String(Math.floor(abs));
  }

  function formatPercentage(inc) {
    
    if (!Number.isFinite(inc)) return '0%';
    const floored = Math.floor(inc * 100) / 100; 
    let s = floored.toFixed(2);
    s = s.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    return s + '%';
  }

  function getProducerName(producerId) {
    
    const PRODUCER_NAMES = {
      'script': 'Script',
      'groupChat': 'Group Chat',
      'workshop': 'Workshop',
      'studio': 'Studio',
      'recyclingCenter': 'Recycling Center',
      'digsite': 'Digsite',
      'officeBuilding': 'Office Building',
      'contentFarm': 'Content Farm',
      'botnet': 'Botnet',
      'spaceport': 'Spaceport',
      'ritualCircle': 'Ritual Circle',
      'memecatcher': 'Memecatcher',
      'quantumHarmonizer': 'Quantum Harmonizer',
      'timeForge': 'Time Forge',
      'wormhole': 'Wormhole',
      'pocketDimension': 'Pocket Dimension',
      'agiShitposter': 'AGI Shitposter',
      'realityShaper': 'Reality Shaper',
      'dysonSphere': 'Dyson Sphere',
      'multiverse': 'Multiverse',
    };
    return PRODUCER_NAMES[producerId] || producerId;
  }

  function buildCard(upgrade) {
    const card = document.createElement('div');
    card.dataset.upgradeId = upgrade.id;
    Object.assign(card.style, {
      flex: '0 0 auto',
      width: '60px',
      height: '60px',
      border: '4px solid #48017f',
      borderRadius: '0',
      background: '#151515',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 6px #0006',
      cursor: 'pointer',
      position: 'relative',
      userSelect: 'none',
    });
    try { card.setAttribute('unselectable','on'); } catch(_) {}
    try { card.onselectstart = () => false; } catch(_) {}

  const formattedPrice = formatPrice(upgrade.basePrice);
  const iconPath = getUpgradeIconPathById(upgrade.id);
    const iconSrc = chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL(iconPath) : iconPath;

    
    const iconImg = document.createElement('img');
    iconImg.src = iconSrc;
    try { iconImg.draggable = false; } catch(_) {}
    iconImg.onerror = () => {
      const fallback = chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL('icons/error.png') : 'icons/error.png';
      iconImg.src = fallback;
    };
    Object.assign(iconImg.style, {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      position: 'absolute',
      left: 0,
      top: 0,
      opacity: 1,
      pointerEvents: 'none',
    });
    card.appendChild(iconImg);

    
    try {
      const parsed = extractProducerIdFromUpgradeId(upgrade.id) || (upgrade.id && upgrade.id.match(/^clickt(\d+)$/) ? { tier: parseInt(RegExp.$1,10)||0 } : null);
      const tier = parsed ? parsed.tier : 0;
      if (tier > 0) {
        const overlay = document.createElement('div');
        overlay.textContent = toRoman(tier);
        Object.assign(overlay.style, {
          position: 'absolute',
          left: '0', top: '0', width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#ff3333', fontWeight: '900', fontSize: '22px',
          textShadow: '0 1px 2px rgba(0,0,0,0.7)',
          opacity: '0.85',
          pointerEvents: 'none',
        });
        card.appendChild(overlay);
      }
    } catch(_) {}
    
    
    let topLine = '';
    let midLine = '';
    if (upgrade.id && /^clickt\d+$/.test(upgrade.id)) {
      
      topLine = '+5% of RPS on click.';
    } else if (typeof upgrade.inc === 'number') {
      const parsed = extractProducerIdFromUpgradeId(upgrade.id);
      if (parsed) {
        const producerName = getProducerName(parsed.producerId);
        const percentageText = formatPercentage(upgrade.inc);
        topLine = `Increases ${producerName} production by ${percentageText}.`;
        
        if (parsed.producerId === 'script') {
          midLine = 'x2 clicking efficiency.';
        }
      }
    }
    const ttLine = upgrade.tt ? String(upgrade.tt) : '';
    
    

    card.addEventListener('mouseenter', () => {
      try {
        if (!window.fjfeRcInfo || typeof window.fjfeRcInfo.show !== 'function') return;
        window.fjfeRcInfo.show({
          imageSrc: iconImg && iconImg.src ? iconImg.src : iconSrc,
          name: upgrade.name,
          cost: formattedPrice,
          bodyTop: topLine,
          bodyMid: midLine || undefined,
          bodyTT: ttLine,
        });
      } catch (_) {}
    });

    card.addEventListener('mouseleave', () => {
      try {
        if (window.fjfeRcInfo && typeof window.fjfeRcInfo.hide === 'function') window.fjfeRcInfo.hide();
      } catch (_) {}
    });

    card.addEventListener('click', () => {
      try { if (window.fjfeRcInfo && typeof window.fjfeRcInfo.hide === 'function') window.fjfeRcInfo.hide(); } catch(_) {}
      purchaseUpgrade(upgrade);
    });

    
    try {
      card._syncAffordability = function() {
        try {
          const canAfford = canAffordPrice(upgrade.basePrice);
          card.style.opacity = canAfford ? '1' : '0.6';
          card.style.cursor = canAfford ? 'pointer' : 'not-allowed';
        } catch(_) {}
      };
      card._syncAffordability();
    } catch(_) {}

    return card;
  }

  function render() {
    if (!state.host) return;
    state.host.innerHTML = '';

    const scrollRow = document.createElement('div');
    scrollRow.setAttribute('data-role', 'fjfe-store-scroll');
    Object.assign(scrollRow.style, {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: '4px',
      overflowX: 'auto',
      overflowY: 'hidden',
      height: '84px',
      padding: '0 0 24px 0',
      boxSizing: 'border-box',
      alignItems: 'flex-start',
      userSelect: 'none',
    });
    
    
    try {
      CLICK_DEFS
        .filter(def => !isUpgradePurchased(def.id) && isClickUpgradeUnlocked(def))
        .forEach(def => {
          scrollRow.appendChild(buildCard({ id: def.id, name: def.name, basePrice: def.basePrice, tt: def.tt }));
        });
    } catch(_) {}
    const unlockedUpgrades = getUnlockedProductionUpgrades();
    unlockedUpgrades.forEach((upgrade) => {
      scrollRow.appendChild(buildCard(upgrade));
    });
    
    state.host.appendChild(scrollRow);
  }

  function init(opts) {
    state.host = opts && opts.host ? opts.host : null;
    render();
  }

  function refresh() {
    render();
    try {
      
      if (state.host) {
        const nodes = state.host.querySelectorAll('[data-upgrade-id]');
        nodes.forEach(n => { try { if (typeof n._syncAffordability === 'function') n._syncAffordability(); } catch(_) {} });
      }
    } catch(_) {}
  }

  function getPermanentUpgrades() {
    return getUnlockedProductionUpgrades();
  }

  
  const getAllUpgradeDefs = function(){
    try {
      
      const clicks = CLICK_DEFS.map(d => ({ id:d.id, name:d.name, tt:d.tt }));
      const prods = PRODUCTION_DEFS.map(d => ({ id:d.id, name:d.name, tt:d.tt, inc:d.inc }));
      return clicks.concat(prods);
    } catch(_) { return []; }
  };

  
  try { window.fjfeStoreAllUpgradeDefs = getAllUpgradeDefs(); } catch(_) {}

  const exportObj = Object.assign(window.fjfeRcStore || {}, {
    init,
    refresh,
    getPermanentUpgrades,
    getAllUpgradeDefs,
    getProducerName,
  });
  window.fjfeRcStore = exportObj;

  
  try {
    window.fjfeRefreshStoreAffordability = function() {
      try {
        if (state.host) {
          const nodes = state.host.querySelectorAll('[data-upgrade-id]');
          nodes.forEach(n => { try { if (typeof n._syncAffordability === 'function') n._syncAffordability(); } catch(_) {} });
        }
      } catch(_) {}
    };
  } catch(_) {}
})();
