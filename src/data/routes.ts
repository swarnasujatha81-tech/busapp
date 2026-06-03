import type { Route, Stop } from '@/types';

export const routeList = [
  '1 Secunderabad - LB Nagar',
  '5 Secunderabad - Mehdipatnam',
  '5K Aramghar - Secunderabad',
  '8A Secunderabad - Chandrayangutta',
  '8X Secunderabad - Ranigunj',
  '10K Secunderabad - Dilsukhnagar',
  '10H Secunderabad - Hitech City',
  '10H Secunderabad - Kondapur',
  '10KJ Secunderabad - JNTU',
  '11 Secunderabad - Uppal',
  '11W Ameerpet - Waverock',
  '12 Secunderabad - Santoshnagar',
  '16D Secunderabad - Dammaiguda',
  '20 Secunderabad - Kukatpally',
  '24S Patancheru - ECIL',
  '49M Mehdipatnam - Secunderabad',
  '65 Secunderabad - Hayathnagar',
  '80 MGBS - Manikonda',
  '90L LB Nagar - Suchitra',
  '92A Secunderabad - Aramghar',
  '101 Koti - Shamshabad Airport',
  '102C Koti - LB Nagar',
  '104A Koti - Champapet',
  '106 Secunderabad - Nizampet',
  '113M Uppal - Mehdipatnam',
  '126M Mehdipatnam - Hitech City',
  '127 Secunderabad - Vanasthalipuram',
  '127K Kondapur - Koti',
  '188 Mehdipatnam - Shamshabad',
  '195 Secunderabad - Bachupally',
  '198 Koti - Gachibowli',
  '204 MGBS - Shamirpet',
  '218 Patancheru - Koti',
  '218H Hayathnagar - Patancheru',
  '218C CBS - Patancheru',
  '219 Secunderabad - Patancheru',
  '219/220 Secunderabad - Patancheru',
  '222 Secunderabad - Lingampally',
  '226 Koti - Lingampally',
  '250 Charminar - Kompally',
  '251 Secunderabad - Shamshabad LB Nagar',
  '288 MGBS - Ramoji Film City',
  '300 Secunderabad - Hi-Tech City',
  '400 MGBS - Gachibowli',
  '900 Airport Express',
  '10KM Secunderabad - Miyapur X Roads',
  '195W HCU Bus Depot - Bachupally X Road'
];

const baseHydStops: Stop[] = [
  { name: 'Secunderabad Bus Stand', latitude: 17.4399, longitude: 78.4983, major: true },
  { name: 'Secunderabad Clock Tower', latitude: 17.4349, longitude: 78.5015 },
  { name: 'MGBS', latitude: 17.3791, longitude: 78.4833, major: true },
  { name: 'Koti', latitude: 17.385, longitude: 78.4867, major: true },
  { name: 'Dilsukhnagar', latitude: 17.3687, longitude: 78.526, major: true },
  { name: 'LB Nagar', latitude: 17.3457, longitude: 78.5522, major: true },
  { name: 'Ameerpet', latitude: 17.4375, longitude: 78.4483, major: true },
  { name: 'Mehdipatnam', latitude: 17.3948, longitude: 78.4344, major: true },
  { name: 'Hitech City', latitude: 17.4435, longitude: 78.3772, major: true },
  { name: 'Kondapur', latitude: 17.4647, longitude: 78.3662 },
  { name: 'JNTU', latitude: 17.4933, longitude: 78.3915, major: true },
  { name: 'Kukatpally', latitude: 17.4849, longitude: 78.4138, major: true },
  { name: 'Uppal', latitude: 17.4056, longitude: 78.5591, major: true },
  { name: 'ECIL', latitude: 17.4702, longitude: 78.5771, major: true },
  { name: 'Patancheru', latitude: 17.5333, longitude: 78.2645, major: true },
  { name: 'Gachibowli', latitude: 17.4401, longitude: 78.3489, major: true },
  { name: 'Lingampally', latitude: 17.4866, longitude: 78.3179, major: true },
  { name: 'Charminar', latitude: 17.3616, longitude: 78.4747, major: true },
  { name: 'Shamshabad Airport', latitude: 17.24, longitude: 78.4294, major: true },
  { name: 'Ramoji Film City', latitude: 17.2543, longitude: 78.6808, major: true },
  { name: 'Hayathnagar', latitude: 17.3284, longitude: 78.5983 },
  { name: 'Manikonda', latitude: 17.4059, longitude: 78.3762 },
  { name: 'Suchitra', latitude: 17.5013, longitude: 78.4791 },
  { name: 'Aramghar', latitude: 17.3238, longitude: 78.4485 },
  { name: 'Chandrayangutta', latitude: 17.3193, longitude: 78.4765 },
  { name: 'Ranigunj', latitude: 17.4237, longitude: 78.4887 },
  { name: 'Santoshnagar', latitude: 17.3473, longitude: 78.5088 },
  { name: 'Dammaiguda', latitude: 17.51, longitude: 78.587 },
  { name: 'Bachupally', latitude: 17.5441, longitude: 78.3541 },
  { name: 'Shamirpet', latitude: 17.5949, longitude: 78.5747 },
  { name: 'Vanasthalipuram', latitude: 17.3307, longitude: 78.5749 },
  { name: 'Kompally', latitude: 17.5399, longitude: 78.4872 }
];

const expandedStopNames = [
  'MGBS (Mahatma Gandhi Bus Station)', 'JBS (Jubilee Bus Station)', 'Afzalgunj', 'Koti', 'Abids', 'Nampally', 'Lakdikapul', 'Khairatabad', 'Secretariat', 'Panjagutta',
  'Ameerpet', 'Begumpet', 'Paradise', 'Secunderabad Station', 'Patny', 'Clock Tower', 'Tarnaka', 'Habsiguda', 'NGRI', 'Uppal X Roads',
  'Ramanthapur', 'Amberpet', 'Golnaka', 'Chaderghat', 'Dilsukhnagar', 'Chaitanyapuri', 'Kothapet', 'LB Nagar', 'Nagole', 'Hayathnagar',
  'Aramghar', 'Shamshabad', 'Rajendranagar', 'Attapur', 'Mehdipatnam', 'Tolichowki', 'Shaikpet', 'Film Nagar', 'Jubilee Hills Check Post', 'Peddamma Temple',
  'Madhapur', 'HITEC City', 'Shilparamam', 'Kondapur', 'Botanical Garden', 'Gachibowli', 'Financial District', 'Nanakramguda', 'Wipro Circle', 'Narsingi',
  'Kokapet', 'Gandipet', 'Osman Sagar', 'CBIT', 'MGIT', 'Langar Houz', 'Golconda Fort', 'Banjara Hills Road No.1', 'Banjara Hills Road No.12', 'Masab Tank',
  'NMDC', 'Erramanzil', 'Punjagutta', 'SR Nagar Bus Stop', 'ESI', 'Erragadda', 'Bharat Nagar', 'Moosapet', 'Kukatpally', 'KPHB',
  'JNTU', 'Nizampet X Roads', 'Miyapur', 'Hafeezpet', 'Chandanagar', 'Lingampally', 'BHEL', 'Beeramguda', 'Patancheru', 'Isnapur',
  'RC Puram', 'Ashok Nagar (BHEL)', 'Allwyn Colony', 'Hydernagar', 'Vivekananda Nagar', 'Pragathi Nagar', 'Bachupally', 'Mallampet', 'Jeedimetla', 'Chintal',
  'Suraram', 'Suchitra', 'Kompally', 'Bowenpally', 'Old Bowenpally', 'Ferozguda', 'Balanagar', 'IDPL', 'Shapur Nagar', 'Gandimaisamma',
  'Alwal', 'Hakimpet', 'Thumkunta', 'Dairy Farm Road', 'Trimulgherry', 'Hasmathpet', 'Tadbund', 'Sikh Village', 'Paradise Circle', 'Rasoolpura',
  'Prakash Nagar', 'Greenlands', 'Yousufguda', 'Krishna Nagar', 'Borabanda', 'Moosapet Y Junction', 'Fateh Nagar', 'Sanathnagar', 'Czech Colony', 'Balkampet',
  'Moti Nagar', 'Kamalanagar', 'Musheerabad', 'RTC X Roads', 'Ashok Nagar X Roads', 'Himayatnagar', 'Liberty', 'Basheerbagh', 'Gunfoundry', 'Mozamjahi Market',
  'Putlibowli', 'Narayanaguda', 'Kachiguda', 'Barkatpura', 'Fever Hospital', 'Vidyanagar', 'Shivam Road', 'Osmania University', 'Arts College', 'Adikmet',
  'Jamai Osmania', 'Warasiguda', 'Mettuguda', 'Bhoiguda', 'Chilkalguda', 'Padmarao Nagar', 'Gandhi Hospital', 'Musarambagh', 'TV Tower', 'Saidabad',
  'Santosh Nagar', 'IS Sadan', 'Chandrayangutta', 'Barkas', 'Falaknuma', 'Shalibanda', 'Charminar', 'Madina', 'City College', 'Puranapul',
  'Bahadurpura', 'Zoo Park', 'Kalapathar', 'Kishanbagh', 'Jiyaguda', 'Karwan', 'Gudimalkapur', 'Asif Nagar', 'Humayun Nagar', 'Nanal Nagar',
  'Vijayanagar Colony', 'Mallepally', 'Red Hills', 'AC Guards', 'Anand Nagar Colony', 'KBR Park', 'Annapurna Studios', 'Road No.36 Jubilee Hills', 'Inorbit Mall', 'Durgam Cheruvu',
  'Raidurg', 'IKEA Circle', 'Mindspace', 'Cyber Towers', 'IIIT Hyderabad', 'Gopanpally', 'Tellapur', 'Osman Nagar', 'Kollur', 'Velimela',
  'Keesara', 'ECIL X Roads', 'Sainikpuri', 'AS Rao Nagar', 'Moula Ali', 'Nacharam', 'Mallapur', 'Cherlapally', 'Peerzadiguda', 'Medipally'
];

const knownStopCoordinates: Record<string, [number, number]> = {
  MGBS: [17.3791, 78.4833], 'MGBS (Mahatma Gandhi Bus Station)': [17.3791, 78.4833], 'JBS (Jubilee Bus Station)': [17.4474, 78.4986],
  Afzalgunj: [17.374, 78.476], Koti: [17.38309842, 78.48281984], Abids: [17.38878348, 78.47640393], Nampally: [17.39207631, 78.47020536], Lakdikapul: [17.4042, 78.4652],
  Khairatabad: [17.41283966, 78.46056819], Secretariat: [17.407964, 78.473153], Panjagutta: [17.4266, 78.4516], Punjagutta: [17.42642206, 78.45273748],
  Ameerpet: [17.431553, 78.44765], Begumpet: [17.44420962, 78.46172825], Paradise: [17.44504816, 78.48706305], 'Paradise Circle': [17.44504816, 78.48706305],
  'Secunderabad Station': [17.43457052, 78.50487894], Patny: [17.44388644, 78.49568903], 'Clock Tower': [17.4432944, 78.49858326], Tarnaka: [17.426442, 78.530393],
  Habsiguda: [17.419199, 78.541818], NGRI: [17.41543991, 78.54587324], 'Uppal X Roads': [17.40143007, 78.56090963], Ramanthapur: [17.39721716, 78.53158236],
  Amberpet: [17.392241, 78.516642], Golnaka: [17.3912, 78.5066], Chaderghat: [17.381472, 78.492653], Dilsukhnagar: [17.36880438, 78.5238387],
  Chaitanyapuri: [17.3652, 78.5355], Kothapet: [17.36683421, 78.54130168], 'LB Nagar': [17.34698734, 78.55012714], Nagole: [17.37648374, 78.55879365], Hayathnagar: [17.32707761, 78.60373244],
  Aramghar: [17.32219789, 78.43161371], Shamshabad: [17.26446107, 78.3913377], Rajendranagar: [17.32984325, 78.40913414], Attapur: [17.37022385, 78.42919841],
  Mehdipatnam: [17.39848156, 78.44418526], Tolichowki: [17.40300029, 78.41710433], Shaikpet: [17.40240202, 78.38046335], 'Film Nagar': [17.41512646, 78.40901066],
  'Jubilee Hills Check Post': [17.42771378, 78.41647799], 'Peddamma Temple': [17.43159835, 78.40720026], Madhapur: [17.44115764, 78.38953257], 'HITEC City': [17.450868, 78.380396],
  Shilparamam: [17.45374801, 78.37936968], Kondapur: [17.46516466, 78.36369753], 'Botanical Garden': [17.45588197, 78.36377263], Gachibowli: [17.43903479, 78.36295187],
  'Financial District': [17.4149, 78.3438], Nanakramguda: [17.4188, 78.3456], 'Wipro Circle': [17.4229, 78.3377], Narsingi: [17.3907, 78.3352],
  Kokapet: [17.3945, 78.3318], Gandipet: [17.3868, 78.3185], 'Osman Sagar': [17.3816, 78.3036], CBIT: [17.3916, 78.3198], MGIT: [17.3905, 78.3206],
  'Langar Houz': [17.3821, 78.4202], 'Golconda Fort': [17.3833, 78.4011], 'Masab Tank': [17.4017, 78.4522], NMDC: [17.3935, 78.4472],
  Erramanzil: [17.4203, 78.4566], 'SR Nagar Bus Stop': [17.44024, 78.44217], ESI: [17.4484, 78.4337], Erragadda: [17.4546, 78.4239],
  'Bharat Nagar': [17.46723208, 78.42877865], Moosapet: [17.47081311, 78.42667579], Kukatpally: [17.48371582, 78.41292411], KPHB: [17.49220149, 78.40192705],
  JNTU: [17.496261, 78.39441], 'Nizampet X Roads': [17.498276, 78.390314], Miyapur: [17.4966936, 78.36077124], Hafeezpet: [17.47951248, 78.36128353],
  Chandanagar: [17.49516128, 78.32297623], Lingampally: [17.49484919, 78.3168903], BHEL: [17.4955, 78.3028], Beeramguda: [17.51694503, 78.30003932], Patancheru: [17.52954198, 78.26410711],
  Isnapur: [17.5443, 78.2151], 'RC Puram': [17.5199, 78.3069], Hydernagar: [17.4938, 78.3888], Bachupally: [17.5441, 78.3541], Suchitra: [17.5013, 78.4791],
  Kompally: [17.5399, 78.4872], Bowenpally: [17.4692, 78.4796], Balanagar: [17.4756, 78.4484], Alwal: [17.5046, 78.5135],
  Trimulgherry: [17.4699, 78.5157], Tadbund: [17.4586, 78.4948], Rasoolpura: [17.4432, 78.4766], Greenlands: [17.432, 78.4566],
  Musheerabad: [17.41875547, 78.49985451], 'RTC X Roads': [17.40802785, 78.4971857], Himayatnagar: [17.4001, 78.4895], Liberty: [17.40641195, 78.47793146],
  Basheerbagh: [17.4006, 78.4774], Narayanaguda: [17.3955, 78.491], Kachiguda: [17.3898, 78.4983], Barkatpura: [17.3929, 78.4998],
  Vidyanagar: [17.4068, 78.5088], 'Osmania University': [17.4135, 78.5284], Mettuguda: [17.4345, 78.5156], Bhoiguda: [17.4268, 78.501],
  Chilkalguda: [17.4332, 78.5088], 'Padmarao Nagar': [17.4221, 78.5107], 'Gandhi Hospital': [17.4251, 78.5028], Musarambagh: [17.3722, 78.5156],
  Saidabad: [17.35933248, 78.50482999], 'Santosh Nagar': [17.3473, 78.5088], 'IS Sadan': [17.35181603, 78.50786353], Chandrayangutta: [17.32683784, 78.4764712],
  Falaknuma: [17.32804743, 78.47433597], Charminar: [17.35961888, 78.47432893], Madina: [17.37037395, 78.47559155], 'City College': [17.36789, 78.467936],
  Puranapul: [17.36914325, 78.46918546], Bahadurpura: [17.355, 78.454], 'Zoo Park': [17.35073566, 78.45249742], Karwan: [17.3762, 78.4288],
  'Asif Nagar': [17.3871, 78.4444], 'Red Hills': [17.3993, 78.4621], 'KBR Park': [17.4237, 78.4164], 'Inorbit Mall': [17.4347, 78.3866],
  'Durgam Cheruvu': [17.4307, 78.3894], Raidurg: [17.44188027, 78.37711134], 'IKEA Circle': [17.4328, 78.3791], Mindspace: [17.44188027, 78.37711134],
  'Cyber Towers': [17.450868, 78.380396], 'IIIT Hyderabad': [17.44550587, 78.35206512], Tellapur: [17.47036611, 78.28812092], Kollur: [17.44268113, 78.25294911],
  Keesara: [17.5281, 78.6656], 'ECIL X Roads': [17.4702, 78.5771], Sainikpuri: [17.4899, 78.5522], 'AS Rao Nagar': [17.4781, 78.5591],
  'Moula Ali': [17.4603, 78.5578], Nacharam: [17.4297, 78.5585], Mallapur: [17.4413, 78.5789], Cherlapally: [17.4717, 78.5942],
  Peerzadiguda: [17.3974, 78.6006], Medipally: [17.4057, 78.6068],
  'Banjara Hills Road No.1': [17.417391, 78.457074], 'Banjara Hills Road No.12': [17.407262, 78.440587],
  'Ashok Nagar (BHEL)': [17.491595, 78.292041], 'Allwyn Colony': [17.504362, 78.414985],
  'Vivekananda Nagar': [17.493568, 78.412348], 'Pragathi Nagar': [17.520015, 78.396888], Mallampet: [17.550219, 78.335861],
  Jeedimetla: [17.519687, 78.446888], Chintal: [17.502176, 78.440609], Suraram: [17.536095, 78.418639],
  'Old Bowenpally': [17.477224, 78.484939], Ferozguda: [17.464618, 78.461633], IDPL: [17.480603, 78.45177],
  'Shapur Nagar': [17.517337, 78.445096], Gandimaisamma: [17.576965, 78.421959], Hakimpet: [17.553, 78.543],
  Thumkunta: [17.564354, 78.551714], 'Dairy Farm Road': [17.489, 78.516], Hasmathpet: [17.472678, 78.486718],
  'Sikh Village': [17.460098, 78.487287], 'Prakash Nagar': [17.444889, 78.465875], Yousufguda: [17.43875, 78.427987],
  'Krishna Nagar': [17.433052, 78.424675], Borabanda: [17.459069, 78.407866], 'Moosapet Y Junction': [17.472572, 78.42999],
  'Fateh Nagar': [17.456201, 78.449924], Sanathnagar: [17.456965, 78.443478], 'Czech Colony': [17.456434, 78.438865],
  Balkampet: [17.446923, 78.450451], 'Moti Nagar': [17.450807, 78.422242], Kamalanagar: [17.472804, 78.566675],
  'Ashok Nagar X Roads': [17.4075, 78.493], Gunfoundry: [17.393644, 78.475665], 'Mozamjahi Market': [17.3845, 78.475052],
  Putlibowli: [17.381389, 78.481944], 'Fever Hospital': [17.395432, 78.502482], 'Shivam Road': [17.400976, 78.513666],
  'Arts College': [17.41914, 78.526358], Adikmet: [17.40955, 78.513094], 'Jamai Osmania': [17.411623, 78.518161],
  Warasiguda: [17.418242, 78.511336], 'TV Tower': [17.3718, 78.5124], Barkas: [17.315518, 78.476499],
  Shalibanda: [17.350395, 78.46527], Kalapathar: [17.345526, 78.460072], Kishanbagh: [17.360833, 78.442748],
  Jiyaguda: [17.370756, 78.44202], Gudimalkapur: [17.38792, 78.437117], 'Humayun Nagar': [17.397111, 78.444766],
  'Nanal Nagar': [17.394457, 78.42686], 'Vijayanagar Colony': [17.407391, 78.455966], Mallepally: [17.392073, 78.454613],
  'AC Guards': [17.399877, 78.458051], 'Anand Nagar Colony': [17.371773, 78.504392], 'Annapurna Studios': [17.428511, 78.42369],
  'Road No.36 Jubilee Hills': [17.438887, 78.399232], Gopanpally: [17.429719, 78.324569], 'Osman Nagar': [17.441813, 78.278223],
  Velimela: [17.475556, 78.236389],
  'Patancheru Bus Station': [17.529542, 78.264107], ICRISAT: [17.511, 78.276], 'Railway Station Gate': [17.516, 78.299],
  'BHEL Pushpak': [17.4955, 78.3028], 'Sri Sai Nagar': [17.512, 78.300], 'Ashok Nagar': [17.491595, 78.292041],
  'Jyothi Nagar': [17.5003, 78.309], Gangaram: [17.4962, 78.329], 'HUDA Colony': [17.492, 78.336],
  'Deepthisree Nagar': [17.49, 78.344], Mythrinagar: [17.493, 78.355], 'Allwyn X Roads': [17.498, 78.371],
  'Miyapur X Road': [17.496694, 78.360771], Nizampet: [17.514, 78.386], 'Kukatpally Y Junction': [17.478, 78.421],
  'Kukatpally Depot': [17.476, 78.424], 'Prem Nagar': [17.466, 78.43], 'SR Nagar': [17.44024, 78.44217],
  'Ameerpet (Maitrivanam)': [17.431553, 78.44765], NIMS: [17.424, 78.456], 'Chintal Basti': [17.411, 78.459],
  Assembly: [17.397, 78.472], 'Nizam College': [17.402, 78.476], 'Bank Street': [17.386, 78.482],
  'Koti Bus Terminal': [17.383098, 78.48282], 'Koti Bus Stop': [17.383098, 78.48282], 'Panama Godowns': [17.329, 78.584],
  Chinthalkunta: [17.338, 78.557], 'Doctors Colony': [17.352, 78.543], 'Ashtalakshmi Temple / Kothapet': [17.366834, 78.541302],
  Moosarambagh: [17.3722, 78.5156], Malakpet: [17.373, 78.503], 'Nalgonda X Roads': [17.372, 78.497],
  'Nizampet Road': [17.498276, 78.390314], Madinaguda: [17.493, 78.338], Muthangi: [17.531, 78.243],
  'Isnapur X Road': [17.5443, 78.2151], Rudraram: [17.554, 78.202], 'GITAM University Hyderabad': [17.553, 78.164],
  'CBS (MGBS)': [17.3791, 78.4833], 'Gandhi Bhavan': [17.386, 78.47], 'Bowenpally X Road': [17.4692, 78.4796],
  'Balanagar X Roads': [17.4756, 78.4484], NIPER: [17.482, 78.449], 'Prashanth Nagar': [17.488, 78.431],
  'Sangeeth Nagar': [17.49, 78.421], 'Sumithra Nagar': [17.499, 78.413], 'KPHB Colony': [17.492201, 78.401927],
  'Vasanth Nagar': [17.5, 78.389], 'Miyapur Metro Station': [17.496694, 78.360771], 'Miyapur Bus Stop': [17.496694, 78.360771],
  'HCU Bus Depot': [17.462, 78.331], 'HCU Telephone Exchange': [17.46, 78.33], 'Hyderabad Central University': [17.456, 78.326],
  'Masjid Banda / Alind Doyens Colony': [17.469, 78.352], 'HCU Gate No. 2': [17.456, 78.347],
  'Gachibowli Stadium': [17.446, 78.345], 'DLF / IIIT': [17.447, 78.354], DLF: [17.447, 78.356], GPRA: [17.444, 78.357],
  'Indira Nagar': [17.441, 78.359], 'Telecom Nagar': [17.438, 78.356], 'Lumbini Avenue': [17.435, 78.365],
  'Cyber Gateway': [17.45, 78.381], 'Hitech City MMTS': [17.448, 78.383], 'Zyka Dhaba': [17.466, 78.386],
  'Malaysian Township': [17.486, 78.394], 'KPHB Circle': [17.493, 78.399], 'KPHB Colony MIG': [17.491, 78.398],
  'Rythu Bazar (KPHB)': [17.492, 78.403], 'JNTU Bus Stop': [17.496261, 78.39441], 'Honey Tots School': [17.514, 78.386],
  'Nizampet Village': [17.526, 78.39], Kesenaris: [17.535, 78.383], 'Rajiv Gandhi Nagar': [17.539, 78.375],
  'Rajiv Gandhi Nagar Phase-2': [17.542, 78.368], 'Bachupally X Road': [17.5441, 78.3541]
};

const curatedRouteStopNames: Record<string, string[]> = {
  '218': [
    'Patancheru Bus Station', 'Patancheru', 'ICRISAT', 'Railway Station Gate', 'RC Puram', 'BHEL Pushpak', 'Beeramguda',
    'Sri Sai Nagar', 'Ashok Nagar', 'Jyothi Nagar', 'Lingampally', 'Chandanagar', 'Gangaram', 'HUDA Colony',
    'Deepthisree Nagar', 'Mythrinagar', 'Allwyn X Roads', 'Miyapur', 'Miyapur X Road', 'Hydernagar', 'Nizampet',
    'JNTU', 'KPHB', 'Vivekananda Nagar', 'Kukatpally', 'Kukatpally Y Junction', 'Kukatpally Depot', 'Moosapet',
    'Bharat Nagar', 'Prem Nagar', 'Erragadda', 'ESI', 'SR Nagar', 'Ameerpet (Maitrivanam)', 'Panjagutta', 'NIMS',
    'Erramanzil', 'Khairatabad', 'Chintal Basti', 'Lakdikapul', 'Assembly', 'Nizam College', 'Abids', 'Bank Street',
    'Koti Bus Terminal', 'Koti Bus Stop'
  ],
  '218H': [
    'Hayathnagar', 'Panama Godowns', 'Chinthalkunta', 'LB Nagar', 'Doctors Colony', 'Ashtalakshmi Temple / Kothapet',
    'Chaitanyapuri', 'Dilsukhnagar', 'Moosarambagh', 'Malakpet', 'Nalgonda X Roads', 'Chaderghat', 'Koti', 'Abids',
    'Nampally', 'Assembly', 'Lakdikapul', 'Khairatabad', 'Erramanzil', 'NIMS', 'Panjagutta', 'Ameerpet', 'SR Nagar',
    'ESI', 'Erragadda', 'Moosapet', 'Kukatpally Depot', 'Kukatpally', 'KPHB', 'JNTU', 'Nizampet Road', 'Hydernagar',
    'Miyapur X Road', 'Miyapur', 'Madinaguda', 'Deepthisree Nagar', 'HUDA Colony', 'Gangaram', 'Chandanagar',
    'Lingampally', 'Jyothi Nagar', 'Ashok Nagar', 'Beeramguda', 'BHEL', 'RC Puram', 'ICRISAT', 'Patancheru Bus Station',
    'Muthangi', 'Isnapur X Road', 'Rudraram', 'GITAM University Hyderabad'
  ],
  '218C': [
    'CBS (MGBS)', 'Afzalgunj', 'Gandhi Bhavan', 'Nampally', 'Lakdikapul', 'Chintal Basti', 'Khairatabad',
    'Erramanzil', 'NIMS', 'Panjagutta', 'Ameerpet', 'SR Nagar', 'ESI', 'Erragadda', 'Bharat Nagar', 'Moosapet',
    'Kukatpally Depot', 'Kukatpally Y Junction', 'Kukatpally', 'KPHB', 'JNTU', 'Nizampet Road', 'Hydernagar',
    'Miyapur X Road', 'Miyapur', 'Allwyn Colony', 'Madinaguda', 'Deepthisree Nagar', 'HUDA Colony', 'Gangaram',
    'Chandanagar', 'Lingampally', 'Jyothi Nagar', 'Ashok Nagar', 'Sri Sai Nagar', 'Beeramguda', 'BHEL', 'RC Puram',
    'Railway Station Gate', 'ICRISAT', 'Patancheru', 'Patancheru Bus Station'
  ],
  '10KM': [
    'Secunderabad Bus Stand', 'JBS (Jubilee Bus Station)', 'Patny', 'Paradise', 'Rasoolpura', 'Begumpet',
    'Greenlands', 'Ameerpet', 'SR Nagar', 'ESI', 'Erragadda', 'Moosapet', 'Kukatpally', 'KPHB', 'JNTU',
    'Miyapur X Road'
  ],
  '219': [
    'Secunderabad Station', 'Secunderabad Bus Stand', 'Clock Tower', 'Paradise', 'Tadbund', 'Bowenpally X Road',
    'Ferozguda', 'Balanagar X Roads', 'NIPER', 'IDPL', 'Prashanth Nagar', 'Sangeeth Nagar', 'Kukatpally',
    'Sumithra Nagar', 'Vivekananda Nagar', 'KPHB Colony', 'JNTU', 'Nizampet X Roads', 'Vasanth Nagar',
    'Hydernagar', 'Miyapur Metro Station', 'Miyapur Bus Stop', 'Allwyn X Roads', 'Madinaguda', 'Deepthisree Nagar',
    'HUDA Colony', 'Gangaram', 'Chandanagar', 'Lingampally', 'Jyothi Nagar', 'Ashok Nagar', 'Sri Sai Nagar',
    'Beeramguda', 'BHEL', 'RC Puram', 'Railway Station Gate', 'ICRISAT', 'Patancheru', 'Patancheru Bus Station'
  ],
  '219/220': [
    'Secunderabad Station', 'Secunderabad Bus Stand', 'Clock Tower', 'Paradise', 'Tadbund', 'Bowenpally X Road',
    'Ferozguda', 'Balanagar', 'IDPL', 'Kukatpally', 'KPHB', 'JNTU', 'Nizampet X Roads', 'Hydernagar',
    'Miyapur', 'Allwyn X Roads', 'Madinaguda', 'Chandanagar', 'Lingampally', 'BHEL', 'RC Puram', 'Patancheru'
  ],
  '195W': [
    'HCU Bus Depot', 'HCU Telephone Exchange', 'Hyderabad Central University', 'Masjid Banda / Alind Doyens Colony',
    'HCU Gate No. 2', 'Gachibowli Stadium', 'DLF / IIIT', 'DLF', 'GPRA', 'Indira Nagar', 'Gachibowli',
    'Telecom Nagar', 'Lumbini Avenue', 'Mindspace', 'Cyber Gateway', 'Hitech City', 'Hitech City MMTS',
    'Zyka Dhaba', 'Malaysian Township', 'KPHB Circle', 'KPHB Colony MIG', 'Rythu Bazar (KPHB)',
    'JNTU Bus Stop', 'Nizampet X Road', 'Honey Tots School', 'Nizampet', 'Nizampet Village', 'Kesenaris',
    'Rajiv Gandhi Nagar', 'Rajiv Gandhi Nagar Phase-2', 'Bachupally X Road'
  ]
};

function fallbackCoordinate(index: number): [number, number] {
  const corridors: Array<[number, number, number, number, number, number]> = [
    [0, 30, 17.3791, 78.4833, 17.3284, 78.5983],
    [31, 57, 17.3238, 78.4485, 17.3868, 78.3185],
    [58, 88, 17.4017, 78.4522, 17.5441, 78.3541],
    [89, 112, 17.5013, 78.4791, 17.432, 78.4566],
    [113, 147, 17.437, 78.445, 17.4221, 78.5107],
    [148, 175, 17.3722, 78.5156, 17.4237, 78.4164],
    [176, 190, 17.4307, 78.4084, 17.4596, 78.2086],
    [191, 200, 17.4702, 78.5771, 17.4057, 78.6068]
  ];
  const corridor = corridors.find(([start, end]) => index >= start && index <= end) || corridors[0];
  const [start, end, lat1, lng1, lat2, lng2] = corridor;
  const t = Math.max(0, Math.min(1, (index - start) / Math.max(1, end - start)));
  const wiggle = ((index % 5) - 2) * 0.0022;
  return [lat1 + (lat2 - lat1) * t + wiggle, lng1 + (lng2 - lng1) * t - wiggle];
}

const expandedStops: Stop[] = expandedStopNames.map((name, index) => {
  const coords = knownStopCoordinates[name] || fallbackCoordinate(index + 1);
  const roadMatched = Boolean(knownStopCoordinates[name]);
  return { name, latitude: coords[0], longitude: coords[1], major: roadMatched, roadMatched };
});

function routeDerivedCoordinate(routeStops: string[], index: number): [number, number] {
  const before = routeStops
    .slice(0, index)
    .map((name, offset) => ({ coords: knownStopCoordinates[name], index: offset }))
    .filter((item): item is { coords: [number, number]; index: number } => Boolean(item.coords))
    .at(-1);
  const after = routeStops
    .slice(index + 1)
    .map((name, offset) => ({ coords: knownStopCoordinates[name], index: index + offset + 1 }))
    .find((item): item is { coords: [number, number]; index: number } => Boolean(item.coords));

  if (before && after) {
    const t = (index - before.index) / Math.max(1, after.index - before.index);
    return [
      before.coords[0] + (after.coords[0] - before.coords[0]) * t,
      before.coords[1] + (after.coords[1] - before.coords[1]) * t
    ];
  }
  return before?.coords || after?.coords || fallbackCoordinate(index);
}

const curatedRouteDerivedStops: Stop[] = Object.values(curatedRouteStopNames).flatMap((routeStops) =>
  routeStops.map((name, index) => {
    const coords = knownStopCoordinates[name] || routeDerivedCoordinate(routeStops, index);
    return { name, latitude: coords[0], longitude: coords[1], major: Boolean(knownStopCoordinates[name]), roadMatched: Boolean(knownStopCoordinates[name]) };
  })
);

const byName = new Map<string, Stop>();
[...baseHydStops, ...expandedStops, ...curatedRouteDerivedStops].forEach((stop) => byName.set(stop.name.toLowerCase(), stop));
export const hydStops: Stop[] = Array.from(byName.values());

export const defaultRoutes: Route[] = routeList.map((name, index) => {
  const [code, ...rest] = name.split(' ');
  const title = rest.join(' ');
  const [origin, destination] = title.split(' - ');
  const curatedStops = curatedRouteStopNames[code]?.map((stopName) => byName.get(stopName.toLowerCase())).filter((stop): stop is Stop => Boolean(stop)) || [];
  const stops = curatedStops.length ? curatedStops : hydStops.filter((stop) => name.toLowerCase().includes(stop.name.split(' ')[0].toLowerCase()));
  return {
    id: code,
    route_code: code,
    route_name: name,
    origin,
    destination,
    stops: stops.length >= 2 ? stops : hydStops.slice(index % 6, index % 6 + 4),
    color: ['#2563eb', '#06b6d4', '#22c55e', '#f97316', '#7c3aed'][index % 5],
    estimated_time_min: 35 + (index % 5) * 8,
    distance_km: 8 + (index % 8) * 3
  };
});
