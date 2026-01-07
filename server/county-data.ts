export interface CountyData {
  name: string;
  state: string;
  stateAbbr: string;
  population: number;
  countySeat: string;
  fips: string;
  areaCodes: number[];
}

export const US_COUNTIES: CountyData[] = [
  // Alabama (AL)
  { name: "Jefferson", state: "Alabama", stateAbbr: "AL", population: 674721, countySeat: "Birmingham", fips: "01073", areaCodes: [205, 659] },
  { name: "Mobile", state: "Alabama", stateAbbr: "AL", population: 414809, countySeat: "Mobile", fips: "01097", areaCodes: [251] },
  { name: "Madison", state: "Alabama", stateAbbr: "AL", population: 392931, countySeat: "Huntsville", fips: "01089", areaCodes: [256, 938] },
  { name: "Montgomery", state: "Alabama", stateAbbr: "AL", population: 229363, countySeat: "Montgomery", fips: "01101", areaCodes: [334] },
  { name: "Shelby", state: "Alabama", stateAbbr: "AL", population: 225200, countySeat: "Columbiana", fips: "01117", areaCodes: [205] },
  { name: "Baldwin", state: "Alabama", stateAbbr: "AL", population: 231767, countySeat: "Bay Minette", fips: "01003", areaCodes: [251] },
  { name: "Tuscaloosa", state: "Alabama", stateAbbr: "AL", population: 227036, countySeat: "Tuscaloosa", fips: "01125", areaCodes: [205] },
  { name: "Lee", state: "Alabama", stateAbbr: "AL", population: 174241, countySeat: "Opelika", fips: "01081", areaCodes: [334] },

  // Alaska (AK)
  { name: "Anchorage", state: "Alaska", stateAbbr: "AK", population: 291247, countySeat: "Anchorage", fips: "02020", areaCodes: [907] },
  { name: "Fairbanks North Star", state: "Alaska", stateAbbr: "AK", population: 97121, countySeat: "Fairbanks", fips: "02090", areaCodes: [907] },
  { name: "Matanuska-Susitna", state: "Alaska", stateAbbr: "AK", population: 108317, countySeat: "Palmer", fips: "02170", areaCodes: [907] },
  { name: "Kenai Peninsula", state: "Alaska", stateAbbr: "AK", population: 59536, countySeat: "Soldotna", fips: "02122", areaCodes: [907] },
  { name: "Juneau", state: "Alaska", stateAbbr: "AK", population: 32255, countySeat: "Juneau", fips: "02110", areaCodes: [907] },

  // Arizona (AZ)
  { name: "Maricopa", state: "Arizona", stateAbbr: "AZ", population: 4485414, countySeat: "Phoenix", fips: "04013", areaCodes: [480, 602, 623] },
  { name: "Pima", state: "Arizona", stateAbbr: "AZ", population: 1047279, countySeat: "Tucson", fips: "04019", areaCodes: [520] },
  { name: "Pinal", state: "Arizona", stateAbbr: "AZ", population: 447559, countySeat: "Florence", fips: "04021", areaCodes: [480, 520] },
  { name: "Yavapai", state: "Arizona", stateAbbr: "AZ", population: 242298, countySeat: "Prescott", fips: "04025", areaCodes: [928] },
  { name: "Mohave", state: "Arizona", stateAbbr: "AZ", population: 218467, countySeat: "Kingman", fips: "04015", areaCodes: [928] },
  { name: "Yuma", state: "Arizona", stateAbbr: "AZ", population: 213787, countySeat: "Yuma", fips: "04027", areaCodes: [928] },
  { name: "Coconino", state: "Arizona", stateAbbr: "AZ", population: 145101, countySeat: "Flagstaff", fips: "04005", areaCodes: [928] },

  // Arkansas (AR)
  { name: "Pulaski", state: "Arkansas", stateAbbr: "AR", population: 399125, countySeat: "Little Rock", fips: "05119", areaCodes: [501] },
  { name: "Benton", state: "Arkansas", stateAbbr: "AR", population: 284333, countySeat: "Bentonville", fips: "05007", areaCodes: [479] },
  { name: "Washington", state: "Arkansas", stateAbbr: "AR", population: 245871, countySeat: "Fayetteville", fips: "05143", areaCodes: [479] },
  { name: "Sebastian", state: "Arkansas", stateAbbr: "AR", population: 129420, countySeat: "Fort Smith", fips: "05131", areaCodes: [479] },
  { name: "Faulkner", state: "Arkansas", stateAbbr: "AR", population: 130447, countySeat: "Conway", fips: "05045", areaCodes: [501] },
  { name: "Craighead", state: "Arkansas", stateAbbr: "AR", population: 112445, countySeat: "Jonesboro", fips: "05031", areaCodes: [870] },

  // California (CA)
  { name: "Los Angeles", state: "California", stateAbbr: "CA", population: 10014009, countySeat: "Los Angeles", fips: "06037", areaCodes: [213, 310, 323, 424, 562, 626, 747, 818] },
  { name: "San Diego", state: "California", stateAbbr: "CA", population: 3298634, countySeat: "San Diego", fips: "06073", areaCodes: [619, 858] },
  { name: "Orange", state: "California", stateAbbr: "CA", population: 3186989, countySeat: "Santa Ana", fips: "06059", areaCodes: [657, 714, 949] },
  { name: "Riverside", state: "California", stateAbbr: "CA", population: 2470546, countySeat: "Riverside", fips: "06065", areaCodes: [442, 760, 951] },
  { name: "San Bernardino", state: "California", stateAbbr: "CA", population: 2180085, countySeat: "San Bernardino", fips: "06071", areaCodes: [442, 760, 909] },
  { name: "Santa Clara", state: "California", stateAbbr: "CA", population: 1936259, countySeat: "San Jose", fips: "06085", areaCodes: [408, 669] },
  { name: "Alameda", state: "California", stateAbbr: "CA", population: 1682353, countySeat: "Oakland", fips: "06001", areaCodes: [510, 341] },
  { name: "Sacramento", state: "California", stateAbbr: "CA", population: 1585055, countySeat: "Sacramento", fips: "06067", areaCodes: [916, 279] },
  { name: "Contra Costa", state: "California", stateAbbr: "CA", population: 1165927, countySeat: "Martinez", fips: "06013", areaCodes: [925] },
  { name: "Fresno", state: "California", stateAbbr: "CA", population: 1008654, countySeat: "Fresno", fips: "06019", areaCodes: [559] },

  // Colorado (CO)
  { name: "Denver", state: "Colorado", stateAbbr: "CO", population: 715522, countySeat: "Denver", fips: "08031", areaCodes: [303, 720] },
  { name: "El Paso", state: "Colorado", stateAbbr: "CO", population: 730395, countySeat: "Colorado Springs", fips: "08041", areaCodes: [719] },
  { name: "Arapahoe", state: "Colorado", stateAbbr: "CO", population: 655070, countySeat: "Littleton", fips: "08005", areaCodes: [303, 720] },
  { name: "Jefferson", state: "Colorado", stateAbbr: "CO", population: 582910, countySeat: "Golden", fips: "08059", areaCodes: [303, 720] },
  { name: "Adams", state: "Colorado", stateAbbr: "CO", population: 519572, countySeat: "Brighton", fips: "08001", areaCodes: [303, 720] },
  { name: "Douglas", state: "Colorado", stateAbbr: "CO", population: 357978, countySeat: "Castle Rock", fips: "08035", areaCodes: [303, 720] },
  { name: "Larimer", state: "Colorado", stateAbbr: "CO", population: 359066, countySeat: "Fort Collins", fips: "08069", areaCodes: [970] },
  { name: "Boulder", state: "Colorado", stateAbbr: "CO", population: 330758, countySeat: "Boulder", fips: "08013", areaCodes: [303, 720] },

  // Connecticut (CT)
  { name: "Fairfield", state: "Connecticut", stateAbbr: "CT", population: 957419, countySeat: "Bridgeport", fips: "09001", areaCodes: [203, 475] },
  { name: "Hartford", state: "Connecticut", stateAbbr: "CT", population: 899498, countySeat: "Hartford", fips: "09003", areaCodes: [860, 959] },
  { name: "New Haven", state: "Connecticut", stateAbbr: "CT", population: 864835, countySeat: "New Haven", fips: "09009", areaCodes: [203, 475] },
  { name: "New London", state: "Connecticut", stateAbbr: "CT", population: 268881, countySeat: "New London", fips: "09011", areaCodes: [860, 959] },
  { name: "Litchfield", state: "Connecticut", stateAbbr: "CT", population: 183031, countySeat: "Litchfield", fips: "09005", areaCodes: [860, 959] },
  { name: "Middlesex", state: "Connecticut", stateAbbr: "CT", population: 163368, countySeat: "Middletown", fips: "09007", areaCodes: [860, 959] },

  // Delaware (DE)
  { name: "New Castle", state: "Delaware", stateAbbr: "DE", population: 570719, countySeat: "Wilmington", fips: "10003", areaCodes: [302] },
  { name: "Sussex", state: "Delaware", stateAbbr: "DE", population: 237378, countySeat: "Georgetown", fips: "10005", areaCodes: [302] },
  { name: "Kent", state: "Delaware", stateAbbr: "DE", population: 181851, countySeat: "Dover", fips: "10001", areaCodes: [302] },

  // District of Columbia (DC)
  { name: "District of Columbia", state: "District of Columbia", stateAbbr: "DC", population: 689545, countySeat: "Washington", fips: "11001", areaCodes: [202] },

  // Florida (FL)
  { name: "Miami-Dade", state: "Florida", stateAbbr: "FL", population: 2716940, countySeat: "Miami", fips: "12086", areaCodes: [305, 786] },
  { name: "Broward", state: "Florida", stateAbbr: "FL", population: 1944375, countySeat: "Fort Lauderdale", fips: "12011", areaCodes: [754, 954] },
  { name: "Palm Beach", state: "Florida", stateAbbr: "FL", population: 1496770, countySeat: "West Palm Beach", fips: "12099", areaCodes: [561] },
  { name: "Hillsborough", state: "Florida", stateAbbr: "FL", population: 1478883, countySeat: "Tampa", fips: "12057", areaCodes: [813] },
  { name: "Orange", state: "Florida", stateAbbr: "FL", population: 1429908, countySeat: "Orlando", fips: "12095", areaCodes: [321, 407] },
  { name: "Pinellas", state: "Florida", stateAbbr: "FL", population: 974996, countySeat: "Clearwater", fips: "12103", areaCodes: [727] },
  { name: "Duval", state: "Florida", stateAbbr: "FL", population: 995567, countySeat: "Jacksonville", fips: "12031", areaCodes: [904] },
  { name: "Lee", state: "Florida", stateAbbr: "FL", population: 770577, countySeat: "Fort Myers", fips: "12071", areaCodes: [239] },
  { name: "Polk", state: "Florida", stateAbbr: "FL", population: 724777, countySeat: "Bartow", fips: "12105", areaCodes: [863] },
  { name: "Brevard", state: "Florida", stateAbbr: "FL", population: 606612, countySeat: "Titusville", fips: "12009", areaCodes: [321] },

  // Georgia (GA)
  { name: "Fulton", state: "Georgia", stateAbbr: "GA", population: 1066710, countySeat: "Atlanta", fips: "13121", areaCodes: [404, 470, 678, 770] },
  { name: "Gwinnett", state: "Georgia", stateAbbr: "GA", population: 957062, countySeat: "Lawrenceville", fips: "13135", areaCodes: [470, 678, 770] },
  { name: "Cobb", state: "Georgia", stateAbbr: "GA", population: 766149, countySeat: "Marietta", fips: "13067", areaCodes: [470, 678, 770] },
  { name: "DeKalb", state: "Georgia", stateAbbr: "GA", population: 764382, countySeat: "Decatur", fips: "13089", areaCodes: [404, 470, 678, 770] },
  { name: "Chatham", state: "Georgia", stateAbbr: "GA", population: 295291, countySeat: "Savannah", fips: "13051", areaCodes: [912] },
  { name: "Cherokee", state: "Georgia", stateAbbr: "GA", population: 269520, countySeat: "Canton", fips: "13057", areaCodes: [470, 678, 770] },
  { name: "Clayton", state: "Georgia", stateAbbr: "GA", population: 297595, countySeat: "Jonesboro", fips: "13063", areaCodes: [404, 470, 678, 770] },
  { name: "Henry", state: "Georgia", stateAbbr: "GA", population: 240712, countySeat: "McDonough", fips: "13151", areaCodes: [470, 678, 770] },

  // Hawaii (HI)
  { name: "Honolulu", state: "Hawaii", stateAbbr: "HI", population: 1016508, countySeat: "Honolulu", fips: "15003", areaCodes: [808] },
  { name: "Hawaii", state: "Hawaii", stateAbbr: "HI", population: 200983, countySeat: "Hilo", fips: "15001", areaCodes: [808] },
  { name: "Maui", state: "Hawaii", stateAbbr: "HI", population: 164754, countySeat: "Wailuku", fips: "15009", areaCodes: [808] },
  { name: "Kauai", state: "Hawaii", stateAbbr: "HI", population: 73298, countySeat: "Lihue", fips: "15007", areaCodes: [808] },

  // Idaho (ID)
  { name: "Ada", state: "Idaho", stateAbbr: "ID", population: 494967, countySeat: "Boise", fips: "16001", areaCodes: [208] },
  { name: "Canyon", state: "Idaho", stateAbbr: "ID", population: 231105, countySeat: "Caldwell", fips: "16027", areaCodes: [208] },
  { name: "Kootenai", state: "Idaho", stateAbbr: "ID", population: 171362, countySeat: "Coeur d'Alene", fips: "16055", areaCodes: [208] },
  { name: "Bannock", state: "Idaho", stateAbbr: "ID", population: 87808, countySeat: "Pocatello", fips: "16005", areaCodes: [208] },
  { name: "Bonneville", state: "Idaho", stateAbbr: "ID", population: 123964, countySeat: "Idaho Falls", fips: "16019", areaCodes: [208] },
  { name: "Twin Falls", state: "Idaho", stateAbbr: "ID", population: 90539, countySeat: "Twin Falls", fips: "16083", areaCodes: [208] },

  // Illinois (IL)
  { name: "Cook", state: "Illinois", stateAbbr: "IL", population: 5275541, countySeat: "Chicago", fips: "17031", areaCodes: [312, 773, 872] },
  { name: "DuPage", state: "Illinois", stateAbbr: "IL", population: 932877, countySeat: "Wheaton", fips: "17043", areaCodes: [331, 630] },
  { name: "Lake", state: "Illinois", stateAbbr: "IL", population: 714342, countySeat: "Waukegan", fips: "17097", areaCodes: [224, 847] },
  { name: "Will", state: "Illinois", stateAbbr: "IL", population: 696355, countySeat: "Joliet", fips: "17197", areaCodes: [815, 779] },
  { name: "Kane", state: "Illinois", stateAbbr: "IL", population: 516522, countySeat: "Geneva", fips: "17089", areaCodes: [331, 630] },
  { name: "McHenry", state: "Illinois", stateAbbr: "IL", population: 310229, countySeat: "Woodstock", fips: "17111", areaCodes: [815, 779] },
  { name: "Winnebago", state: "Illinois", stateAbbr: "IL", population: 285350, countySeat: "Rockford", fips: "17201", areaCodes: [815, 779] },
  { name: "Madison", state: "Illinois", stateAbbr: "IL", population: 265670, countySeat: "Edwardsville", fips: "17119", areaCodes: [618] },

  // Indiana (IN)
  { name: "Marion", state: "Indiana", stateAbbr: "IN", population: 977203, countySeat: "Indianapolis", fips: "18097", areaCodes: [317, 463] },
  { name: "Lake", state: "Indiana", stateAbbr: "IN", population: 498700, countySeat: "Crown Point", fips: "18089", areaCodes: [219] },
  { name: "Allen", state: "Indiana", stateAbbr: "IN", population: 385340, countySeat: "Fort Wayne", fips: "18003", areaCodes: [260] },
  { name: "Hamilton", state: "Indiana", stateAbbr: "IN", population: 338011, countySeat: "Noblesville", fips: "18057", areaCodes: [317, 463] },
  { name: "St. Joseph", state: "Indiana", stateAbbr: "IN", population: 272912, countySeat: "South Bend", fips: "18141", areaCodes: [574] },
  { name: "Elkhart", state: "Indiana", stateAbbr: "IN", population: 206341, countySeat: "Goshen", fips: "18039", areaCodes: [574] },
  { name: "Tippecanoe", state: "Indiana", stateAbbr: "IN", population: 195732, countySeat: "Lafayette", fips: "18157", areaCodes: [765] },

  // Iowa (IA)
  { name: "Polk", state: "Iowa", stateAbbr: "IA", population: 492401, countySeat: "Des Moines", fips: "19153", areaCodes: [515] },
  { name: "Linn", state: "Iowa", stateAbbr: "IA", population: 230299, countySeat: "Cedar Rapids", fips: "19113", areaCodes: [319] },
  { name: "Scott", state: "Iowa", stateAbbr: "IA", population: 173815, countySeat: "Davenport", fips: "19163", areaCodes: [563] },
  { name: "Johnson", state: "Iowa", stateAbbr: "IA", population: 154310, countySeat: "Iowa City", fips: "19103", areaCodes: [319] },
  { name: "Black Hawk", state: "Iowa", stateAbbr: "IA", population: 131228, countySeat: "Waterloo", fips: "19013", areaCodes: [319] },
  { name: "Woodbury", state: "Iowa", stateAbbr: "IA", population: 104779, countySeat: "Sioux City", fips: "19193", areaCodes: [712] },

  // Kansas (KS)
  { name: "Johnson", state: "Kansas", stateAbbr: "KS", population: 609863, countySeat: "Olathe", fips: "20091", areaCodes: [913] },
  { name: "Sedgwick", state: "Kansas", stateAbbr: "KS", population: 523824, countySeat: "Wichita", fips: "20173", areaCodes: [316] },
  { name: "Shawnee", state: "Kansas", stateAbbr: "KS", population: 178909, countySeat: "Topeka", fips: "20177", areaCodes: [785] },
  { name: "Wyandotte", state: "Kansas", stateAbbr: "KS", population: 167939, countySeat: "Kansas City", fips: "20209", areaCodes: [913] },
  { name: "Douglas", state: "Kansas", stateAbbr: "KS", population: 118053, countySeat: "Lawrence", fips: "20045", areaCodes: [785] },
  { name: "Leavenworth", state: "Kansas", stateAbbr: "KS", population: 83227, countySeat: "Leavenworth", fips: "20103", areaCodes: [913] },

  // Kentucky (KY)
  { name: "Jefferson", state: "Kentucky", stateAbbr: "KY", population: 782969, countySeat: "Louisville", fips: "21111", areaCodes: [502] },
  { name: "Fayette", state: "Kentucky", stateAbbr: "KY", population: 323780, countySeat: "Lexington", fips: "21067", areaCodes: [859] },
  { name: "Kenton", state: "Kentucky", stateAbbr: "KY", population: 167838, countySeat: "Covington", fips: "21117", areaCodes: [859] },
  { name: "Boone", state: "Kentucky", stateAbbr: "KY", population: 139393, countySeat: "Burlington", fips: "21015", areaCodes: [859] },
  { name: "Warren", state: "Kentucky", stateAbbr: "KY", population: 138047, countySeat: "Bowling Green", fips: "21227", areaCodes: [270] },
  { name: "Hardin", state: "Kentucky", stateAbbr: "KY", population: 111117, countySeat: "Elizabethtown", fips: "21093", areaCodes: [270] },

  // Louisiana (LA)
  { name: "East Baton Rouge", state: "Louisiana", stateAbbr: "LA", population: 456781, countySeat: "Baton Rouge", fips: "22033", areaCodes: [225] },
  { name: "Jefferson", state: "Louisiana", stateAbbr: "LA", population: 441854, countySeat: "Gretna", fips: "22051", areaCodes: [504] },
  { name: "Orleans", state: "Louisiana", stateAbbr: "LA", population: 383997, countySeat: "New Orleans", fips: "22071", areaCodes: [504] },
  { name: "St. Tammany", state: "Louisiana", stateAbbr: "LA", population: 272622, countySeat: "Covington", fips: "22103", areaCodes: [985] },
  { name: "Caddo", state: "Louisiana", stateAbbr: "LA", population: 251868, countySeat: "Shreveport", fips: "22017", areaCodes: [318] },
  { name: "Calcasieu", state: "Louisiana", stateAbbr: "LA", population: 216785, countySeat: "Lake Charles", fips: "22019", areaCodes: [337] },
  { name: "Lafayette", state: "Louisiana", stateAbbr: "LA", population: 249997, countySeat: "Lafayette", fips: "22055", areaCodes: [337] },

  // Maine (ME)
  { name: "Cumberland", state: "Maine", stateAbbr: "ME", population: 303069, countySeat: "Portland", fips: "23005", areaCodes: [207] },
  { name: "York", state: "Maine", stateAbbr: "ME", population: 211972, countySeat: "Alfred", fips: "23031", areaCodes: [207] },
  { name: "Penobscot", state: "Maine", stateAbbr: "ME", population: 152199, countySeat: "Bangor", fips: "23019", areaCodes: [207] },
  { name: "Kennebec", state: "Maine", stateAbbr: "ME", population: 123642, countySeat: "Augusta", fips: "23011", areaCodes: [207] },
  { name: "Androscoggin", state: "Maine", stateAbbr: "ME", population: 111139, countySeat: "Auburn", fips: "23001", areaCodes: [207] },

  // Maryland (MD)
  { name: "Montgomery", state: "Maryland", stateAbbr: "MD", population: 1062061, countySeat: "Rockville", fips: "24031", areaCodes: [240, 301] },
  { name: "Prince George's", state: "Maryland", stateAbbr: "MD", population: 967201, countySeat: "Upper Marlboro", fips: "24033", areaCodes: [240, 301] },
  { name: "Baltimore", state: "Maryland", stateAbbr: "MD", population: 854535, countySeat: "Towson", fips: "24005", areaCodes: [410, 443, 667] },
  { name: "Anne Arundel", state: "Maryland", stateAbbr: "MD", population: 588261, countySeat: "Annapolis", fips: "24003", areaCodes: [410, 443, 667] },
  { name: "Howard", state: "Maryland", stateAbbr: "MD", population: 332317, countySeat: "Ellicott City", fips: "24027", areaCodes: [410, 443, 667] },
  { name: "Frederick", state: "Maryland", stateAbbr: "MD", population: 271717, countySeat: "Frederick", fips: "24021", areaCodes: [240, 301] },
  { name: "Harford", state: "Maryland", stateAbbr: "MD", population: 263265, countySeat: "Bel Air", fips: "24025", areaCodes: [410, 443, 667] },

  // Massachusetts (MA)
  { name: "Middlesex", state: "Massachusetts", stateAbbr: "MA", population: 1632002, countySeat: "Cambridge", fips: "25017", areaCodes: [339, 617, 781, 857, 978] },
  { name: "Worcester", state: "Massachusetts", stateAbbr: "MA", population: 862111, countySeat: "Worcester", fips: "25027", areaCodes: [351, 508, 774] },
  { name: "Suffolk", state: "Massachusetts", stateAbbr: "MA", population: 803907, countySeat: "Boston", fips: "25025", areaCodes: [617, 857] },
  { name: "Essex", state: "Massachusetts", stateAbbr: "MA", population: 809829, countySeat: "Salem", fips: "25009", areaCodes: [351, 978] },
  { name: "Norfolk", state: "Massachusetts", stateAbbr: "MA", population: 725981, countySeat: "Dedham", fips: "25021", areaCodes: [339, 617, 781, 857] },
  { name: "Bristol", state: "Massachusetts", stateAbbr: "MA", population: 579200, countySeat: "Taunton", fips: "25005", areaCodes: [508, 774] },
  { name: "Plymouth", state: "Massachusetts", stateAbbr: "MA", population: 530819, countySeat: "Plymouth", fips: "25023", areaCodes: [339, 508, 774, 781] },
  { name: "Hampden", state: "Massachusetts", stateAbbr: "MA", population: 465825, countySeat: "Springfield", fips: "25013", areaCodes: [413] },

  // Michigan (MI)
  { name: "Wayne", state: "Michigan", stateAbbr: "MI", population: 1793561, countySeat: "Detroit", fips: "26163", areaCodes: [313] },
  { name: "Oakland", state: "Michigan", stateAbbr: "MI", population: 1274395, countySeat: "Pontiac", fips: "26125", areaCodes: [248, 947] },
  { name: "Macomb", state: "Michigan", stateAbbr: "MI", population: 881217, countySeat: "Mount Clemens", fips: "26099", areaCodes: [586] },
  { name: "Kent", state: "Michigan", stateAbbr: "MI", population: 657974, countySeat: "Grand Rapids", fips: "26081", areaCodes: [616] },
  { name: "Genesee", state: "Michigan", stateAbbr: "MI", population: 406211, countySeat: "Flint", fips: "26049", areaCodes: [810] },
  { name: "Washtenaw", state: "Michigan", stateAbbr: "MI", population: 372258, countySeat: "Ann Arbor", fips: "26161", areaCodes: [734] },
  { name: "Ottawa", state: "Michigan", stateAbbr: "MI", population: 296200, countySeat: "Grand Haven", fips: "26139", areaCodes: [616] },
  { name: "Ingham", state: "Michigan", stateAbbr: "MI", population: 284900, countySeat: "Mason", fips: "26065", areaCodes: [517] },

  // Minnesota (MN)
  { name: "Hennepin", state: "Minnesota", stateAbbr: "MN", population: 1281565, countySeat: "Minneapolis", fips: "27053", areaCodes: [612, 763, 952] },
  { name: "Ramsey", state: "Minnesota", stateAbbr: "MN", population: 552352, countySeat: "Saint Paul", fips: "27123", areaCodes: [651] },
  { name: "Dakota", state: "Minnesota", stateAbbr: "MN", population: 439882, countySeat: "Hastings", fips: "27037", areaCodes: [651, 952] },
  { name: "Anoka", state: "Minnesota", stateAbbr: "MN", population: 363887, countySeat: "Anoka", fips: "27003", areaCodes: [763] },
  { name: "Washington", state: "Minnesota", stateAbbr: "MN", population: 267568, countySeat: "Stillwater", fips: "27163", areaCodes: [651] },
  { name: "St. Louis", state: "Minnesota", stateAbbr: "MN", population: 200231, countySeat: "Duluth", fips: "27137", areaCodes: [218] },
  { name: "Olmsted", state: "Minnesota", stateAbbr: "MN", population: 162847, countySeat: "Rochester", fips: "27109", areaCodes: [507] },

  // Mississippi (MS)
  { name: "Hinds", state: "Mississippi", stateAbbr: "MS", population: 231840, countySeat: "Jackson", fips: "28049", areaCodes: [601, 769] },
  { name: "Harrison", state: "Mississippi", stateAbbr: "MS", population: 208080, countySeat: "Gulfport", fips: "28047", areaCodes: [228] },
  { name: "DeSoto", state: "Mississippi", stateAbbr: "MS", population: 188710, countySeat: "Hernando", fips: "28033", areaCodes: [662] },
  { name: "Rankin", state: "Mississippi", stateAbbr: "MS", population: 157031, countySeat: "Brandon", fips: "28121", areaCodes: [601, 769] },
  { name: "Jackson", state: "Mississippi", stateAbbr: "MS", population: 143617, countySeat: "Pascagoula", fips: "28059", areaCodes: [228] },
  { name: "Madison", state: "Mississippi", stateAbbr: "MS", population: 111003, countySeat: "Canton", fips: "28089", areaCodes: [601, 769] },

  // Missouri (MO)
  { name: "St. Louis", state: "Missouri", stateAbbr: "MO", population: 1004125, countySeat: "Clayton", fips: "29189", areaCodes: [314] },
  { name: "Jackson", state: "Missouri", stateAbbr: "MO", population: 717204, countySeat: "Independence", fips: "29095", areaCodes: [816] },
  { name: "St. Charles", state: "Missouri", stateAbbr: "MO", population: 405262, countySeat: "St. Charles", fips: "29183", areaCodes: [636] },
  { name: "Greene", state: "Missouri", stateAbbr: "MO", population: 298915, countySeat: "Springfield", fips: "29077", areaCodes: [417] },
  { name: "Clay", state: "Missouri", stateAbbr: "MO", population: 253335, countySeat: "Liberty", fips: "29047", areaCodes: [816] },
  { name: "Jefferson", state: "Missouri", stateAbbr: "MO", population: 227557, countySeat: "Hillsboro", fips: "29099", areaCodes: [636] },
  { name: "Boone", state: "Missouri", stateAbbr: "MO", population: 183610, countySeat: "Columbia", fips: "29019", areaCodes: [573] },

  // Montana (MT)
  { name: "Yellowstone", state: "Montana", stateAbbr: "MT", population: 164731, countySeat: "Billings", fips: "30111", areaCodes: [406] },
  { name: "Missoula", state: "Montana", stateAbbr: "MT", population: 119600, countySeat: "Missoula", fips: "30063", areaCodes: [406] },
  { name: "Gallatin", state: "Montana", stateAbbr: "MT", population: 118960, countySeat: "Bozeman", fips: "30031", areaCodes: [406] },
  { name: "Flathead", state: "Montana", stateAbbr: "MT", population: 104357, countySeat: "Kalispell", fips: "30029", areaCodes: [406] },
  { name: "Cascade", state: "Montana", stateAbbr: "MT", population: 82684, countySeat: "Great Falls", fips: "30013", areaCodes: [406] },
  { name: "Lewis and Clark", state: "Montana", stateAbbr: "MT", population: 72655, countySeat: "Helena", fips: "30049", areaCodes: [406] },

  // Nebraska (NE)
  { name: "Douglas", state: "Nebraska", stateAbbr: "NE", population: 584526, countySeat: "Omaha", fips: "31055", areaCodes: [402, 531] },
  { name: "Lancaster", state: "Nebraska", stateAbbr: "NE", population: 322608, countySeat: "Lincoln", fips: "31109", areaCodes: [402, 531] },
  { name: "Sarpy", state: "Nebraska", stateAbbr: "NE", population: 193586, countySeat: "Papillion", fips: "31153", areaCodes: [402, 531] },
  { name: "Hall", state: "Nebraska", stateAbbr: "NE", population: 61353, countySeat: "Grand Island", fips: "31079", areaCodes: [308] },
  { name: "Buffalo", state: "Nebraska", stateAbbr: "NE", population: 50817, countySeat: "Kearney", fips: "31019", areaCodes: [308] },
  { name: "Scotts Bluff", state: "Nebraska", stateAbbr: "NE", population: 36108, countySeat: "Gering", fips: "31157", areaCodes: [308] },

  // Nevada (NV)
  { name: "Clark", state: "Nevada", stateAbbr: "NV", population: 2265461, countySeat: "Las Vegas", fips: "32003", areaCodes: [702, 725] },
  { name: "Washoe", state: "Nevada", stateAbbr: "NV", population: 486492, countySeat: "Reno", fips: "32031", areaCodes: [775] },
  { name: "Carson City", state: "Nevada", stateAbbr: "NV", population: 58639, countySeat: "Carson City", fips: "32510", areaCodes: [775] },
  { name: "Douglas", state: "Nevada", stateAbbr: "NV", population: 49488, countySeat: "Minden", fips: "32005", areaCodes: [775] },
  { name: "Lyon", state: "Nevada", stateAbbr: "NV", population: 61313, countySeat: "Yerington", fips: "32019", areaCodes: [775] },
  { name: "Elko", state: "Nevada", stateAbbr: "NV", population: 53702, countySeat: "Elko", fips: "32007", areaCodes: [775] },

  // New Hampshire (NH)
  { name: "Hillsborough", state: "New Hampshire", stateAbbr: "NH", population: 422937, countySeat: "Nashua", fips: "33011", areaCodes: [603] },
  { name: "Rockingham", state: "New Hampshire", stateAbbr: "NH", population: 314176, countySeat: "Brentwood", fips: "33015", areaCodes: [603] },
  { name: "Merrimack", state: "New Hampshire", stateAbbr: "NH", population: 153808, countySeat: "Concord", fips: "33013", areaCodes: [603] },
  { name: "Strafford", state: "New Hampshire", stateAbbr: "NH", population: 131875, countySeat: "Dover", fips: "33017", areaCodes: [603] },
  { name: "Grafton", state: "New Hampshire", stateAbbr: "NH", population: 91118, countySeat: "Haverhill", fips: "33009", areaCodes: [603] },

  // New Jersey (NJ)
  { name: "Bergen", state: "New Jersey", stateAbbr: "NJ", population: 955732, countySeat: "Hackensack", fips: "34003", areaCodes: [201, 551] },
  { name: "Middlesex", state: "New Jersey", stateAbbr: "NJ", population: 863162, countySeat: "New Brunswick", fips: "34023", areaCodes: [732, 848] },
  { name: "Essex", state: "New Jersey", stateAbbr: "NJ", population: 863728, countySeat: "Newark", fips: "34013", areaCodes: [862, 973] },
  { name: "Hudson", state: "New Jersey", stateAbbr: "NJ", population: 724854, countySeat: "Jersey City", fips: "34017", areaCodes: [201, 551] },
  { name: "Monmouth", state: "New Jersey", stateAbbr: "NJ", population: 643615, countySeat: "Freehold", fips: "34025", areaCodes: [732, 848] },
  { name: "Ocean", state: "New Jersey", stateAbbr: "NJ", population: 637229, countySeat: "Toms River", fips: "34029", areaCodes: [732, 848] },
  { name: "Union", state: "New Jersey", stateAbbr: "NJ", population: 575345, countySeat: "Elizabeth", fips: "34039", areaCodes: [908] },
  { name: "Passaic", state: "New Jersey", stateAbbr: "NJ", population: 524118, countySeat: "Paterson", fips: "34031", areaCodes: [862, 973] },

  // New Mexico (NM)
  { name: "Bernalillo", state: "New Mexico", stateAbbr: "NM", population: 676953, countySeat: "Albuquerque", fips: "35001", areaCodes: [505] },
  { name: "Dona Ana", state: "New Mexico", stateAbbr: "NM", population: 219561, countySeat: "Las Cruces", fips: "35013", areaCodes: [575] },
  { name: "Santa Fe", state: "New Mexico", stateAbbr: "NM", population: 154823, countySeat: "Santa Fe", fips: "35049", areaCodes: [505] },
  { name: "Sandoval", state: "New Mexico", stateAbbr: "NM", population: 153919, countySeat: "Bernalillo", fips: "35043", areaCodes: [505] },
  { name: "San Juan", state: "New Mexico", stateAbbr: "NM", population: 123958, countySeat: "Aztec", fips: "35045", areaCodes: [505] },
  { name: "Valencia", state: "New Mexico", stateAbbr: "NM", population: 76205, countySeat: "Los Lunas", fips: "35061", areaCodes: [505] },

  // New York (NY)
  { name: "Kings", state: "New York", stateAbbr: "NY", population: 2736074, countySeat: "Brooklyn", fips: "36047", areaCodes: [347, 718, 917, 929] },
  { name: "Queens", state: "New York", stateAbbr: "NY", population: 2405464, countySeat: "Jamaica", fips: "36081", areaCodes: [347, 718, 917, 929] },
  { name: "New York", state: "New York", stateAbbr: "NY", population: 1694251, countySeat: "New York", fips: "36061", areaCodes: [212, 332, 646, 917] },
  { name: "Suffolk", state: "New York", stateAbbr: "NY", population: 1525920, countySeat: "Riverhead", fips: "36103", areaCodes: [631] },
  { name: "Bronx", state: "New York", stateAbbr: "NY", population: 1472654, countySeat: "Bronx", fips: "36005", areaCodes: [347, 718, 917, 929] },
  { name: "Nassau", state: "New York", stateAbbr: "NY", population: 1395774, countySeat: "Mineola", fips: "36059", areaCodes: [516] },
  { name: "Westchester", state: "New York", stateAbbr: "NY", population: 1004457, countySeat: "White Plains", fips: "36119", areaCodes: [914] },
  { name: "Erie", state: "New York", stateAbbr: "NY", population: 954236, countySeat: "Buffalo", fips: "36029", areaCodes: [716] },
  { name: "Monroe", state: "New York", stateAbbr: "NY", population: 759443, countySeat: "Rochester", fips: "36055", areaCodes: [585] },
  { name: "Richmond", state: "New York", stateAbbr: "NY", population: 495747, countySeat: "St. George", fips: "36085", areaCodes: [347, 718, 917, 929] },

  // North Carolina (NC)
  { name: "Mecklenburg", state: "North Carolina", stateAbbr: "NC", population: 1115482, countySeat: "Charlotte", fips: "37119", areaCodes: [704, 980] },
  { name: "Wake", state: "North Carolina", stateAbbr: "NC", population: 1129410, countySeat: "Raleigh", fips: "37183", areaCodes: [919, 984] },
  { name: "Guilford", state: "North Carolina", stateAbbr: "NC", population: 541299, countySeat: "Greensboro", fips: "37081", areaCodes: [336] },
  { name: "Forsyth", state: "North Carolina", stateAbbr: "NC", population: 382295, countySeat: "Winston-Salem", fips: "37067", areaCodes: [336] },
  { name: "Cumberland", state: "North Carolina", stateAbbr: "NC", population: 335509, countySeat: "Fayetteville", fips: "37051", areaCodes: [910] },
  { name: "Durham", state: "North Carolina", stateAbbr: "NC", population: 324833, countySeat: "Durham", fips: "37063", areaCodes: [919, 984] },
  { name: "Buncombe", state: "North Carolina", stateAbbr: "NC", population: 269452, countySeat: "Asheville", fips: "37021", areaCodes: [828] },
  { name: "Gaston", state: "North Carolina", stateAbbr: "NC", population: 227943, countySeat: "Gastonia", fips: "37071", areaCodes: [704, 980] },

  // North Dakota (ND)
  { name: "Cass", state: "North Dakota", stateAbbr: "ND", population: 184684, countySeat: "Fargo", fips: "38017", areaCodes: [701] },
  { name: "Burleigh", state: "North Dakota", stateAbbr: "ND", population: 99595, countySeat: "Bismarck", fips: "38015", areaCodes: [701] },
  { name: "Grand Forks", state: "North Dakota", stateAbbr: "ND", population: 73170, countySeat: "Grand Forks", fips: "38035", areaCodes: [701] },
  { name: "Ward", state: "North Dakota", stateAbbr: "ND", population: 70867, countySeat: "Minot", fips: "38101", areaCodes: [701] },
  { name: "Williams", state: "North Dakota", stateAbbr: "ND", population: 40891, countySeat: "Williston", fips: "38105", areaCodes: [701] },

  // Ohio (OH)
  { name: "Cuyahoga", state: "Ohio", stateAbbr: "OH", population: 1264817, countySeat: "Cleveland", fips: "39035", areaCodes: [216] },
  { name: "Franklin", state: "Ohio", stateAbbr: "OH", population: 1323807, countySeat: "Columbus", fips: "39049", areaCodes: [614] },
  { name: "Hamilton", state: "Ohio", stateAbbr: "OH", population: 830639, countySeat: "Cincinnati", fips: "39061", areaCodes: [513] },
  { name: "Summit", state: "Ohio", stateAbbr: "OH", population: 541810, countySeat: "Akron", fips: "39153", areaCodes: [234, 330] },
  { name: "Montgomery", state: "Ohio", stateAbbr: "OH", population: 537309, countySeat: "Dayton", fips: "39113", areaCodes: [937] },
  { name: "Lucas", state: "Ohio", stateAbbr: "OH", population: 431279, countySeat: "Toledo", fips: "39095", areaCodes: [419, 567] },
  { name: "Stark", state: "Ohio", stateAbbr: "OH", population: 374853, countySeat: "Canton", fips: "39151", areaCodes: [234, 330] },
  { name: "Butler", state: "Ohio", stateAbbr: "OH", population: 390357, countySeat: "Hamilton", fips: "39017", areaCodes: [513] },

  // Oklahoma (OK)
  { name: "Oklahoma", state: "Oklahoma", stateAbbr: "OK", population: 797434, countySeat: "Oklahoma City", fips: "40109", areaCodes: [405] },
  { name: "Tulsa", state: "Oklahoma", stateAbbr: "OK", population: 669279, countySeat: "Tulsa", fips: "40143", areaCodes: [918, 539] },
  { name: "Cleveland", state: "Oklahoma", stateAbbr: "OK", population: 298850, countySeat: "Norman", fips: "40027", areaCodes: [405] },
  { name: "Canadian", state: "Oklahoma", stateAbbr: "OK", population: 156055, countySeat: "El Reno", fips: "40017", areaCodes: [405] },
  { name: "Comanche", state: "Oklahoma", stateAbbr: "OK", population: 126420, countySeat: "Lawton", fips: "40031", areaCodes: [580] },
  { name: "Rogers", state: "Oklahoma", stateAbbr: "OK", population: 95819, countySeat: "Claremore", fips: "40131", areaCodes: [918, 539] },

  // Oregon (OR)
  { name: "Multnomah", state: "Oregon", stateAbbr: "OR", population: 815428, countySeat: "Portland", fips: "41051", areaCodes: [503, 971] },
  { name: "Washington", state: "Oregon", stateAbbr: "OR", population: 600372, countySeat: "Hillsboro", fips: "41067", areaCodes: [503, 971] },
  { name: "Clackamas", state: "Oregon", stateAbbr: "OR", population: 421401, countySeat: "Oregon City", fips: "41005", areaCodes: [503, 971] },
  { name: "Lane", state: "Oregon", stateAbbr: "OR", population: 382067, countySeat: "Eugene", fips: "41039", areaCodes: [458, 541] },
  { name: "Marion", state: "Oregon", stateAbbr: "OR", population: 347818, countySeat: "Salem", fips: "41047", areaCodes: [503, 971] },
  { name: "Jackson", state: "Oregon", stateAbbr: "OR", population: 223259, countySeat: "Medford", fips: "41029", areaCodes: [458, 541] },
  { name: "Deschutes", state: "Oregon", stateAbbr: "OR", population: 198253, countySeat: "Bend", fips: "41017", areaCodes: [458, 541] },

  // Pennsylvania (PA)
  { name: "Philadelphia", state: "Pennsylvania", stateAbbr: "PA", population: 1603797, countySeat: "Philadelphia", fips: "42101", areaCodes: [215, 267, 445] },
  { name: "Allegheny", state: "Pennsylvania", stateAbbr: "PA", population: 1250578, countySeat: "Pittsburgh", fips: "42003", areaCodes: [412, 878] },
  { name: "Montgomery", state: "Pennsylvania", stateAbbr: "PA", population: 856553, countySeat: "Norristown", fips: "42091", areaCodes: [215, 267, 445, 484, 610] },
  { name: "Bucks", state: "Pennsylvania", stateAbbr: "PA", population: 645260, countySeat: "Doylestown", fips: "42017", areaCodes: [215, 267, 445] },
  { name: "Delaware", state: "Pennsylvania", stateAbbr: "PA", population: 576830, countySeat: "Media", fips: "42045", areaCodes: [484, 610] },
  { name: "Lancaster", state: "Pennsylvania", stateAbbr: "PA", population: 552984, countySeat: "Lancaster", fips: "42071", areaCodes: [717] },
  { name: "Chester", state: "Pennsylvania", stateAbbr: "PA", population: 534413, countySeat: "West Chester", fips: "42029", areaCodes: [484, 610] },
  { name: "York", state: "Pennsylvania", stateAbbr: "PA", population: 456438, countySeat: "York", fips: "42133", areaCodes: [717] },

  // Rhode Island (RI)
  { name: "Providence", state: "Rhode Island", stateAbbr: "RI", population: 660741, countySeat: "Providence", fips: "44007", areaCodes: [401] },
  { name: "Kent", state: "Rhode Island", stateAbbr: "RI", population: 170363, countySeat: "East Greenwich", fips: "44003", areaCodes: [401] },
  { name: "Washington", state: "Rhode Island", stateAbbr: "RI", population: 129839, countySeat: "West Kingston", fips: "44009", areaCodes: [401] },
  { name: "Newport", state: "Rhode Island", stateAbbr: "RI", population: 85643, countySeat: "Newport", fips: "44005", areaCodes: [401] },

  // South Carolina (SC)
  { name: "Greenville", state: "South Carolina", stateAbbr: "SC", population: 525534, countySeat: "Greenville", fips: "45045", areaCodes: [864] },
  { name: "Richland", state: "South Carolina", stateAbbr: "SC", population: 415759, countySeat: "Columbia", fips: "45079", areaCodes: [803] },
  { name: "Charleston", state: "South Carolina", stateAbbr: "SC", population: 411406, countySeat: "Charleston", fips: "45019", areaCodes: [843] },
  { name: "Horry", state: "South Carolina", stateAbbr: "SC", population: 365419, countySeat: "Conway", fips: "45051", areaCodes: [843] },
  { name: "Spartanburg", state: "South Carolina", stateAbbr: "SC", population: 328982, countySeat: "Spartanburg", fips: "45083", areaCodes: [864] },
  { name: "Lexington", state: "South Carolina", stateAbbr: "SC", population: 311718, countySeat: "Lexington", fips: "45063", areaCodes: [803] },
  { name: "York", state: "South Carolina", stateAbbr: "SC", population: 287248, countySeat: "York", fips: "45091", areaCodes: [803] },

  // South Dakota (SD)
  { name: "Minnehaha", state: "South Dakota", stateAbbr: "SD", population: 198648, countySeat: "Sioux Falls", fips: "46099", areaCodes: [605] },
  { name: "Pennington", state: "South Dakota", stateAbbr: "SD", population: 115099, countySeat: "Rapid City", fips: "46103", areaCodes: [605] },
  { name: "Lincoln", state: "South Dakota", stateAbbr: "SD", population: 66672, countySeat: "Canton", fips: "46083", areaCodes: [605] },
  { name: "Brown", state: "South Dakota", stateAbbr: "SD", population: 39373, countySeat: "Aberdeen", fips: "46013", areaCodes: [605] },
  { name: "Codington", state: "South Dakota", stateAbbr: "SD", population: 28801, countySeat: "Watertown", fips: "46029", areaCodes: [605] },

  // Tennessee (TN)
  { name: "Shelby", state: "Tennessee", stateAbbr: "TN", population: 929744, countySeat: "Memphis", fips: "47157", areaCodes: [901] },
  { name: "Davidson", state: "Tennessee", stateAbbr: "TN", population: 715884, countySeat: "Nashville", fips: "47037", areaCodes: [615, 629] },
  { name: "Knox", state: "Tennessee", stateAbbr: "TN", population: 478971, countySeat: "Knoxville", fips: "47093", areaCodes: [865] },
  { name: "Hamilton", state: "Tennessee", stateAbbr: "TN", population: 366207, countySeat: "Chattanooga", fips: "47065", areaCodes: [423] },
  { name: "Rutherford", state: "Tennessee", stateAbbr: "TN", population: 341486, countySeat: "Murfreesboro", fips: "47149", areaCodes: [615, 629] },
  { name: "Williamson", state: "Tennessee", stateAbbr: "TN", population: 247726, countySeat: "Franklin", fips: "47187", areaCodes: [615, 629] },
  { name: "Sumner", state: "Tennessee", stateAbbr: "TN", population: 200118, countySeat: "Gallatin", fips: "47165", areaCodes: [615, 629] },
  { name: "Montgomery", state: "Tennessee", stateAbbr: "TN", population: 220069, countySeat: "Clarksville", fips: "47125", areaCodes: [931] },

  // Texas (TX)
  { name: "Harris", state: "Texas", stateAbbr: "TX", population: 4731145, countySeat: "Houston", fips: "48201", areaCodes: [281, 346, 713, 832] },
  { name: "Dallas", state: "Texas", stateAbbr: "TX", population: 2613539, countySeat: "Dallas", fips: "48113", areaCodes: [214, 469, 972] },
  { name: "Tarrant", state: "Texas", stateAbbr: "TX", population: 2110640, countySeat: "Fort Worth", fips: "48439", areaCodes: [682, 817] },
  { name: "Bexar", state: "Texas", stateAbbr: "TX", population: 2009324, countySeat: "San Antonio", fips: "48029", areaCodes: [210] },
  { name: "Travis", state: "Texas", stateAbbr: "TX", population: 1290188, countySeat: "Austin", fips: "48453", areaCodes: [512, 737] },
  { name: "Collin", state: "Texas", stateAbbr: "TX", population: 1064465, countySeat: "McKinney", fips: "48085", areaCodes: [214, 469, 972] },
  { name: "Hidalgo", state: "Texas", stateAbbr: "TX", population: 870781, countySeat: "Edinburg", fips: "48215", areaCodes: [956] },
  { name: "El Paso", state: "Texas", stateAbbr: "TX", population: 868859, countySeat: "El Paso", fips: "48141", areaCodes: [915] },
  { name: "Denton", state: "Texas", stateAbbr: "TX", population: 906422, countySeat: "Denton", fips: "48121", areaCodes: [940] },
  { name: "Fort Bend", state: "Texas", stateAbbr: "TX", population: 822779, countySeat: "Richmond", fips: "48157", areaCodes: [281, 346, 713, 832] },

  // Utah (UT)
  { name: "Salt Lake", state: "Utah", stateAbbr: "UT", population: 1185238, countySeat: "Salt Lake City", fips: "49035", areaCodes: [385, 801] },
  { name: "Utah", state: "Utah", stateAbbr: "UT", population: 659399, countySeat: "Provo", fips: "49049", areaCodes: [385, 801] },
  { name: "Davis", state: "Utah", stateAbbr: "UT", population: 364419, countySeat: "Farmington", fips: "49011", areaCodes: [385, 801] },
  { name: "Weber", state: "Utah", stateAbbr: "UT", population: 267345, countySeat: "Ogden", fips: "49057", areaCodes: [385, 801] },
  { name: "Washington", state: "Utah", stateAbbr: "UT", population: 189193, countySeat: "St. George", fips: "49053", areaCodes: [435] },
  { name: "Cache", state: "Utah", stateAbbr: "UT", population: 133154, countySeat: "Logan", fips: "49005", areaCodes: [435] },

  // Vermont (VT)
  { name: "Chittenden", state: "Vermont", stateAbbr: "VT", population: 168323, countySeat: "Burlington", fips: "50007", areaCodes: [802] },
  { name: "Rutland", state: "Vermont", stateAbbr: "VT", population: 60572, countySeat: "Rutland", fips: "50021", areaCodes: [802] },
  { name: "Washington", state: "Vermont", stateAbbr: "VT", population: 59807, countySeat: "Montpelier", fips: "50023", areaCodes: [802] },
  { name: "Windsor", state: "Vermont", stateAbbr: "VT", population: 57753, countySeat: "Woodstock", fips: "50027", areaCodes: [802] },
  { name: "Franklin", state: "Vermont", stateAbbr: "VT", population: 49946, countySeat: "St. Albans", fips: "50011", areaCodes: [802] },

  // Virginia (VA)
  { name: "Fairfax", state: "Virginia", stateAbbr: "VA", population: 1150309, countySeat: "Fairfax", fips: "51059", areaCodes: [571, 703] },
  { name: "Prince William", state: "Virginia", stateAbbr: "VA", population: 482204, countySeat: "Prince William", fips: "51153", areaCodes: [571, 703] },
  { name: "Loudoun", state: "Virginia", stateAbbr: "VA", population: 420959, countySeat: "Leesburg", fips: "51107", areaCodes: [571, 703] },
  { name: "Chesterfield", state: "Virginia", stateAbbr: "VA", population: 364548, countySeat: "Chesterfield", fips: "51041", areaCodes: [804] },
  { name: "Henrico", state: "Virginia", stateAbbr: "VA", population: 334389, countySeat: "Richmond", fips: "51087", areaCodes: [804] },
  { name: "Virginia Beach", state: "Virginia", stateAbbr: "VA", population: 459470, countySeat: "Virginia Beach", fips: "51810", areaCodes: [757] },
  { name: "Arlington", state: "Virginia", stateAbbr: "VA", population: 238643, countySeat: "Arlington", fips: "51013", areaCodes: [571, 703] },
  { name: "Chesapeake", state: "Virginia", stateAbbr: "VA", population: 249422, countySeat: "Chesapeake", fips: "51550", areaCodes: [757] },

  // Washington (WA)
  { name: "King", state: "Washington", stateAbbr: "WA", population: 2269675, countySeat: "Seattle", fips: "53033", areaCodes: [206, 253, 425] },
  { name: "Pierce", state: "Washington", stateAbbr: "WA", population: 921130, countySeat: "Tacoma", fips: "53053", areaCodes: [253] },
  { name: "Snohomish", state: "Washington", stateAbbr: "WA", population: 827957, countySeat: "Everett", fips: "53061", areaCodes: [360, 425] },
  { name: "Spokane", state: "Washington", stateAbbr: "WA", population: 539339, countySeat: "Spokane", fips: "53063", areaCodes: [509] },
  { name: "Clark", state: "Washington", stateAbbr: "WA", population: 503311, countySeat: "Vancouver", fips: "53011", areaCodes: [360, 564] },
  { name: "Thurston", state: "Washington", stateAbbr: "WA", population: 294793, countySeat: "Olympia", fips: "53067", areaCodes: [360] },
  { name: "Kitsap", state: "Washington", stateAbbr: "WA", population: 275611, countySeat: "Port Orchard", fips: "53035", areaCodes: [360] },
  { name: "Yakima", state: "Washington", stateAbbr: "WA", population: 256728, countySeat: "Yakima", fips: "53077", areaCodes: [509] },

  // West Virginia (WV)
  { name: "Kanawha", state: "West Virginia", stateAbbr: "WV", population: 183293, countySeat: "Charleston", fips: "54039", areaCodes: [304, 681] },
  { name: "Berkeley", state: "West Virginia", stateAbbr: "WV", population: 122089, countySeat: "Martinsburg", fips: "54003", areaCodes: [304, 681] },
  { name: "Cabell", state: "West Virginia", stateAbbr: "WV", population: 93206, countySeat: "Huntington", fips: "54011", areaCodes: [304, 681] },
  { name: "Monongalia", state: "West Virginia", stateAbbr: "WV", population: 105612, countySeat: "Morgantown", fips: "54061", areaCodes: [304, 681] },
  { name: "Wood", state: "West Virginia", stateAbbr: "WV", population: 84296, countySeat: "Parkersburg", fips: "54107", areaCodes: [304, 681] },
  { name: "Raleigh", state: "West Virginia", stateAbbr: "WV", population: 74591, countySeat: "Beckley", fips: "54081", areaCodes: [304, 681] },

  // Wisconsin (WI)
  { name: "Milwaukee", state: "Wisconsin", stateAbbr: "WI", population: 939489, countySeat: "Milwaukee", fips: "55079", areaCodes: [414] },
  { name: "Dane", state: "Wisconsin", stateAbbr: "WI", population: 561504, countySeat: "Madison", fips: "55025", areaCodes: [608] },
  { name: "Waukesha", state: "Wisconsin", stateAbbr: "WI", population: 406978, countySeat: "Waukesha", fips: "55133", areaCodes: [262] },
  { name: "Brown", state: "Wisconsin", stateAbbr: "WI", population: 268740, countySeat: "Green Bay", fips: "55009", areaCodes: [920] },
  { name: "Racine", state: "Wisconsin", stateAbbr: "WI", population: 197727, countySeat: "Racine", fips: "55101", areaCodes: [262] },
  { name: "Outagamie", state: "Wisconsin", stateAbbr: "WI", population: 190705, countySeat: "Appleton", fips: "55087", areaCodes: [920] },
  { name: "Kenosha", state: "Wisconsin", stateAbbr: "WI", population: 170150, countySeat: "Kenosha", fips: "55059", areaCodes: [262] },
  { name: "Rock", state: "Wisconsin", stateAbbr: "WI", population: 163687, countySeat: "Janesville", fips: "55105", areaCodes: [608] },

  // Wyoming (WY)
  { name: "Laramie", state: "Wyoming", stateAbbr: "WY", population: 100512, countySeat: "Cheyenne", fips: "56021", areaCodes: [307] },
  { name: "Natrona", state: "Wyoming", stateAbbr: "WY", population: 80647, countySeat: "Casper", fips: "56025", areaCodes: [307] },
  { name: "Campbell", state: "Wyoming", stateAbbr: "WY", population: 46539, countySeat: "Gillette", fips: "56005", areaCodes: [307] },
  { name: "Sweetwater", state: "Wyoming", stateAbbr: "WY", population: 42343, countySeat: "Green River", fips: "56037", areaCodes: [307] },
  { name: "Fremont", state: "Wyoming", stateAbbr: "WY", population: 39711, countySeat: "Lander", fips: "56013", areaCodes: [307] },
  { name: "Albany", state: "Wyoming", stateAbbr: "WY", population: 38880, countySeat: "Laramie", fips: "56001", areaCodes: [307] },
];

export function getCountiesByState(stateNames: string[]): CountyData[] {
  const normalizedStateNames = stateNames.map(name => name.toLowerCase());
  return US_COUNTIES.filter(county => {
    const lowerState = county.state.toLowerCase();
    const lowerAbbr = county.stateAbbr.toLowerCase();
    return normalizedStateNames.some(name => 
      name === lowerState || name === lowerAbbr
    );
  });
}

export function generatePhoneNumber(areaCodes: number[]): string {
  const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
  const exchange = Math.floor(Math.random() * 800) + 200;
  const subscriber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `(${areaCode}) ${exchange}-${subscriber}`;
}

export function generateWebsite(countyName: string, stateAbbr: string): string {
  const cleanName = countyName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const formats = [
    `https://www.${cleanName}county.gov`,
    `https://www.${cleanName}county${stateAbbr.toLowerCase()}.gov`,
    `https://${cleanName}.${stateAbbr.toLowerCase()}.gov`,
    `https://www.co.${cleanName}.${stateAbbr.toLowerCase()}.us`,
  ];
  return formats[Math.floor(Math.random() * formats.length)];
}

export function generateEmail(department: string, countyName: string): string {
  const cleanDept = department.toLowerCase().replace(/[^a-z]/g, '').slice(0, 12);
  const cleanName = countyName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const formats = [
    `${cleanDept}@${cleanName}county.gov`,
    `${cleanDept}@${cleanName}.gov`,
    `info.${cleanDept}@${cleanName}county.gov`,
  ];
  return formats[Math.floor(Math.random() * formats.length)];
}
