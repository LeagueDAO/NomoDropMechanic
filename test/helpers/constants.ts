export const tokenPrice: string = (1 * 10 ** 18).toString();

export const zeroAddress = "0x0000000000000000000000000000000000000000";

export const collectibleItems: number = 102;

export const maxQuantity: number = 100;

export let maxTokensPerWallet: number = 20;

export const testAddress: string = "0x380Fa2d97357e2bEf991c63CEC20a280b8CA6EE3";

export const testAddress2: string = "0xB97584664DD26D4aDD36DCA6A77020fCe60CA7FF";

export const ONE_MIN_IN_MILLIS: number = 60000;

export const ONE_MIN: number = 60;

export const ONE_HOUR = ONE_MIN * 60;

export const TWO_HOURS = ONE_HOUR * 2;

export const THREE_HOURS = ONE_HOUR * 3;

export const FOUR_HOURS = ONE_HOUR * 4;

export const WHITELISTED_TEST_ADDRESSES = [
    "0x37997880A9181A7161E3e87cfA356a0A3D4110Af",
    "0x01f5aE733e50ebc46E1FbC0F4e17bc689d2655C0",
    "0x9c2630593eBf796fEEB422fA31A864451F25EFC9",
    "0x1B39f06Ad0CD2b4917efA69eFaCe87d36fE6EA56",
    "0x8b208b0114f376052FEC5fF172B44852d1b9B0FF",
    "0xFa3270918A759482979E269378e6d666d58Ab6a8",
    "0x644627Ee1C50017148d7F52C6e772Bc1fd1523d5",
    "0x75989E88b2937b587b2e475841fe35b2A16DAfc7",
    "0x83C81EC81C17Da1D2A27ab50f7717a2333a1ddEd",
    "0xB4e0Fb3FB0172B68A538dE63787B94bB1Ff3Be3B",
    "0xEE00352af6c2CA16647246Fe9974F0A74de065cC",
    "0x8a2726d84Af6D62b9E731154CeC092Ab3b058a24",
    "0x9E749A614Fed179aaff3d05351865a2beB749105",
    "0x899308DC11f8b21B65F2BadC51c41d8B71B230AF",
    "0x1BCd3FE87c60BDD1902495a13CC3C3Cd82C41E38",
    "0xF7e212Cc2C2a94d85Db1AA2A78c9648DF0eeef8E",
    "0x97D5091857D9fc652bE629953941D044656362a4",
    "0x980159bBb3D0374a030B14579e81094562e1083c",
    "0x88697929Ed12904330f16cEEfBa4A1cC80ff0200",
    "0x53E25255401D447e7B83e0041B852982A1C330D2",
    "0x7bB2ECFDf218d355a99A2C40D62dce7d026FF576",
    "0xE26996913aC79c609dE2f3552C2a8573254Ff78C",
    "0x97F421E36bE4f604E1C21FCc7567bf509c4cf2C2",
    "0x173915Ab68b46471b9d95A6749e76090Ac55b4DB",
    "0x49Cb92907D13Aae6F4532E2Df6c24f799a71fe23",
    "0x63d09DDe02df1CaEc99285680d7072141671F372",
    "0x65Cf26069FE239588bF24aDe356b4Cb43Fd6Ab36",
    "0x24171782fAbc37b81A75c18c9284cD0DeD5111c2",
    "0x2FD5299E1F7261fAa425a34275294C4289526719",
    "0x17F8ddB3193D65a9fE6b1cEBe318ae509F6dAa48",
    "0x845b79Bd38e7Da577Cb5CdCB158D094131531aa5",
    "0xfB145e5Ac4E3fC0E4699f5700B5BB113E8121Ad4",
    "0x075880B62e6518Fe8fB101A2c86B218Bb9645b6d",
    "0xde59f9bE3cdCAA185DcBeE88f64b36E1691a9994",
    "0x94e83448598C0866fc97467f669DD08dC97188fD",
    "0x0329F3438B831A6bb0Af21c404BC32b4f6a41dbB",
    "0x9B049032DcD50320B2F648Ea4E511cCD2C61a7c8",
    "0x8a936a4bcaD4C84Fb6d72BF9177EfC2bA04CF049",
    "0x7ff420DCfE541Fe09Aa1a908A1F1BC23D20d9dCa",
    "0xE36E67bC301418F0057966F53a556eD68750AB5C",
    "0x5a37256bfC2F8199F2BdA00821EFEFee3D738312",
    "0xC97De323C04e778f551c3DeF1C8d2F35E872825B",
    "0xE4D3b232258022771A3e2C5ccab154C28A44f2A8",
    "0x5d030227183566B6b976C4330cef301527b8D23e",
    "0x40a8A551e7c5E277d8F4b2ce5942EaA65914E671",
    "0xC7640cbA4E976F0E266844Eae5F598e366b8f915",
    "0x533f5AA62c6218258ce2543Be96a9bFB324EF48e",
    "0x822F3bf5B8FD6a0B127743AA5c86e9aa558DFC39",
    "0x7C52eE7bD28f7671635833bfeE41ea1888AED54f",
    "0x0985275E13f82E465763164C2495312b6534b323",
    "0xb490E5c6e1DF6e68Cd134356895c7c9e5A5B1187",
    "0x06910AB6a14Cd2F41101f2ACC8F2324d6cd217B9",
    "0x1913FA72568853221416e4C574201Ede4EebB9E1",
    "0xD498A8C61B94D1A24233588e6Da71e1f9A734E12",
    "0xfF2761Bd00a207Ac870aC6369f66aE130F2CAAd3",
    "0xFb22166eAb4dadceC7496496e9fa6F62AD3A6A78",
    "0x89aA1Be318e0B3e520B00d11560BD3b2346a40f9",
    "0xd09154c654F772f50F1248131c8a92082a74fA32",
    "0xb1e1664f7BbfFa1efe1f6E830b48e4a0B4e83990",
    "0x62CF714Ac5df49598DcB2763DB480f40c1DAAD31",
    "0x654140539CE96416836DBb5AaDd4E51D371A68c6",
    "0x2a8C1B10d95e3CE963689178522F88854EEA77d4",
    "0x406E38E69E3AcedbCDDFd73B4fC769966CdA9aE6",
    "0xC5Eb488F10Eba6ae7D79Dac62dEC8D1051F81BF8",
    "0x2fA0E04B7513DCC85612040B234a88056B2a6c8E",
    "0x67Ff19DBC6C944983a268B726443324A5577be5b",
    "0x3C500360f20d042520986120357283da3667cA6D",
    "0xdFe6D95cC6bFDcE73fac439ed0EFfCa8C0bd3CA5",
    "0xA7BF8d918831eE239a071E012De18eD3F4a298A4",
    "0x61F18c368597Db7C2A850202c432E2248Fc31f3f",
    "0xA87507CF3a9DD5762F05444eC6A4D43cbBaC061b",
    "0xde1022c1708294424566AD262793C4055a83e399",
    "0x3C157d1F49B1233cd3b7351d05352931Ad7a0Df0",
    "0xBadA35d9a5B706cB627748a6D96B7B144443e189",
    "0x79953462a764cADF0dD8DAbea8a9C1a57aC69224",
    "0xE8a522E659199653277807E4Ad8D94990F7BfBB4",
    "0x434D0449578e7D8d3B6791dEB4d6f00b8f3fC4c3",
    "0x8c1b7A5a583A9911BE7E6fBe72661331112E6187",
    "0xFfD58B94E564b576645023C9F6F08b375b116e41",
    "0xC90270e012B4808B912A3ceF3BeB8F2Ef423CfB4",
    "0xFEdee7783a7E40aC608032472A7Cf5176BE3F7FC",
    "0xe82e3Fc2058D74C490DcC58697777C8985ffAC10",
    "0xabB46D77728647A9d5D890ae41DBc733eB8Da670",
    "0xc54779bF07B287CaF56aF1283c8864B619380285",
    "0x7dEB701481f3A99dA07b607b9E0c02e170EA01Ed",
    "0x30eC3f523CD053a5335d48d3508ba101a809D5bb",
    "0x29f195988B3a048ff2FFeA51fcC4D42C0591dd46",
    "0x03907c525DEAba840409ED9FFAf5D7Cd87ED0B95",
    "0x69e7F4E36EBa9407629c24f755d1Cc3395643A97",
    "0xdcDDD73189cd49dF41a36D433a8D688B7BC8A8b1",
    "0x876c25c431Ce1B7A800c1E879326F852cB0520EF",
    "0x33E09904b71176A84fbf7C2b21f202Ae201b1768",
    "0x42B05a30E17a170945A6C588f722EA49F179530e",
    "0x93e4d3f2E68Ab0dF5FBe3C94B3E938375321408F",
    "0x1fE864c2B4C56c5a8ffD85B3Db4c349298c3F5bc",
    "0x575458b396902d7becf59eea365B07583cB351a7",
    "0x68eBd7696A8FaA45A363F02fd0480e5247046a31",
    "0x3eCfA435fc05502cE4eFd60439b5dEdc3cA87b03",
    "0x6aFAe3967b7A24ed64F10201c348DBB101a9f117",
    "0x50baB056A55D3892980dEAD2310b1186e93b0f8b",
    "0x8900395C49897825Cf4d34147563a64c13c5c73e",
    "0x2e5714B5CBAff58DF3a9A294eF5bFb73C5799168",
    "0x788d52e707b6a7781CecB52BF366c0F5f71dE92d",
    "0xc87026BE082eb5fC6632f33B7700873066c68FCD",
    "0x41D40c10624ebE4BE3729f3Fa1B18dCEaeb56C8f",
    "0xb7324C541996F67E7987Bf60fd8c8a39798545e9",
    "0x3fd4Ac5c74C667889827624B82c6A181520ECDdB",
    "0xDE18fA70C967a4dDb400D1b1dc2B3318c25b2659",
    "0x35943Cd5D51C03C65EBad88AD4E957D07B3F82B1",
    "0xb8df0f2E5884199073EdeEf58ED068C5931F926a",
    "0xf86a23d4E8e4405a5e9Ea5F8a5160706E756Ed72",
    "0x5a4d6c1775FD1f5bc1232Ad13c6340EdC0dB48f5",
    "0xE79BDd365a19BaA097165243d4b0C1c0C3Bd9432",
    "0xB4f527c4fA50a9Ae6363bAF510356C398023bB5d",
    "0xe2548F01c744817628A069F3342a7aAB2A271d27",
    "0x74f0405C503734D0DfBD6B8Da597ff7ACcEE9D93",
    "0xFA92fe40E9994faf1AAfFE7aA3067C4D98001eaC",
    "0x071c27E934Def125619A1a20c9C108729825422b",
    "0xC7ba43E0c878fD020218B8C1Ced26b37761e1ad4",
    "0x3CAdC90E66ceBd8b3D5b8AfC45D23b51f0dc9fFA",
    "0xaD3D6536C80b1Eaf90Ea316CDA1F03Ee7f5D3561",
    "0x6A205368Cb5f2aDe4DE154FFB86d0687B5B5B3c8",
    "0xaf77B7DE58FC15c5138D34d5b916923582d332c0",
    "0xEC5C1522d3053B214Ed443E72C0b205d484AC868",
    "0x97e6625e48e3B7f1daAB7bf386AB02DBe90eBc22",
    "0x676fF46687394087259DACd9B185471Dca291d3b",
    "0x8d31ec0aD4BdB66F0bB464C4288ef7964bed3A18",
    "0xabC858344fC0e6Ef68B393a443beAe6Df8C5fDf6",
    "0x06F5f99061cDDcfA0c1D131f66Cd266fF1a048d3",
    "0xf45ddCC6C76106A16C53A41f47151cC983934bab",
    "0xfd0c1f788De35e1d8e63472De15e87Dc1e2cC241",
    "0x154146eCBE0A4145D704863A529f5DeA63E062E5",
    "0x747A0A0485990a2BbC463DC8B298b8Da0E316Ee4",
    "0x375519733250bE6f1d98AA2358F19D3cB0F60a53",
    "0x2cb41546fF37179a89fB0bD393ceb52694dAedE8",
    "0x73C782fA0d42A70D61aCDFA3EEF4c85453D2382B",
    "0x00c6737FC5406554011Db160546B34cC28c9Dc9B",
    "0xf6213dAB46A40a9BbfCf05A2A3C7EF90a38159b6",
    "0x2917eeddfF795557c3dc5f858fc6492fe12F62dA",
    "0x6Af1DdE913dcc2E035D4cA587B59784d27073410",
    "0x93df185200b338FEf9823f97eC29494FE700345f",
    "0x67f429E5deAed8925A546773a2281D9f9dAE00CA",
    "0xd972F8Ce75Ac66478D7c66F7d82329b50b72aE17",
    "0x6A32125F05a724B79e467877e46af22D8138B2c8",
    "0x0d61B6D3b7024C5AF62D571231eEcce4c32019C9",
    "0x23b1f058E7467445d9DBa8D4F34D0277922B1016",
    "0xcA0b5362e84871c84e9E9aca599703F8466ef353",
    "0xe7e443F4160c21c22eEE71e1f31aE52C84dE67eD",
    "0x9F64A2fE37537e3f87c9f739AdeFB507a780e263",
    "0x819791d933E5044945c799A800Ab922b4E730E03"
];
