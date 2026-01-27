export type Bank = {
    id: number;
    name: string;
    code: string;
    bin: string;
    shortName: string;
    logo: string;
    transferSupported: number;
    lookupSupported: number;
    color?: string;
};

export const BANKS: Bank[] = [
    {
        "id": 43,
        "name": "Ngân hàng TMCP Ngoại Thương Việt Nam",
        "code": "VCB",
        "bin": "970436",
        "shortName": "Vietcombank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/VCB-B4kRR0pv.svg",
        "transferSupported": 1,
        "color": "#57b446",
        "lookupSupported": 1
    },
    {
        "id": 17,
        "name": "Ngân hàng TMCP Công thương Việt Nam",
        "code": "ICB",
        "bin": "970415",
        "shortName": "VietinBank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/VTB-CLVy73PX.svg",
        "transferSupported": 1,
        "color": "#005aab",
        "lookupSupported": 1
    },
    {
        "id": 4,
        "name": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam",
        "code": "BIDV",
        "bin": "970418",
        "shortName": "BIDV",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/BIDV-7csRnTfs.svg",
        "transferSupported": 1,
        "color": "#204690",
        "lookupSupported": 1
    },
    {
        "id": 42,
        "name": "Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam",
        "code": "VBA",
        "bin": "970405",
        "shortName": "Agribank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/AGB-C4YtPQtP.svg",
        "transferSupported": 1,
        "color": "#a02d33",
        "lookupSupported": 1
    },
    {
        "id": 38,
        "name": "Ngân hàng TMCP Kỹ thương Việt Nam",
        "code": "TCB",
        "bin": "970407",
        "shortName": "Techcombank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/TCB-ezEq28B0.svg",
        "transferSupported": 1,
        "color": "#e21c23",
        "lookupSupported": 1
    },
    {
        "id": 21,
        "name": "Ngân hàng TMCP Quân đội",
        "code": "MB",
        "bin": "970422",
        "shortName": "MBBank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/MBB-Bq07MdjF.svg",
        "transferSupported": 1,
        "color": "#182c81",
        "lookupSupported": 1
    },
    {
        "id": 2,
        "name": "Ngân hàng TMCP Á Châu",
        "code": "ACB",
        "bin": "970416",
        "shortName": "ACB",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/ACB-D8hhFDHs.svg",
        "transferSupported": 1,
        "color": "#055ba6",
        "lookupSupported": 1
    },
    {
        "id": 12,
        "name": "Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh",
        "code": "HDB",
        "bin": "970437",
        "shortName": "HDBank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/HD-Bcu-5CSb.svg",
        "transferSupported": 1,
        "color": "#c9151c",
        "lookupSupported": 1
    },
    {
        "id": 45,
        "name": "Ngân hàng TMCP Quốc tế Việt Nam",
        "code": "VIB",
        "bin": "970441",
        "shortName": "VIB",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/VIB-DjwmjpHG.svg",
        "transferSupported": 1,
        "color": "#0064af",
        "lookupSupported": 1
    },
    {
        "id": 39,
        "name": "Ngân hàng TMCP Tiên Phong",
        "code": "TPB",
        "bin": "970423",
        "shortName": "TPBank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/TPBank-DaVApkEh.svg",
        "transferSupported": 1,
        "color": "#7e2f8d",
        "lookupSupported": 1
    },
    {
        "id": 1,
        "name": "Ngân hàng TMCP An Bình",
        "code": "ABB",
        "bin": "970425",
        "shortName": "ABBANK",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/ABB-BZkyx-jk.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 88,
        "name": "Agricultural Bank of China Hanoi",
        "code": "ABC",
        "bin": "",
        "shortName": "ABC",
        "logo": "data:image/svg+xml,%3csvg%20width='40'%20height='40'%20viewBox='0%200%2040%2040'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3ccircle%20cx='20'%20cy='20'%20r='20'%20fill='%23F3F4F5'/%3e%3cpath%20d='M27.7778%2010H12.2222C10.9967%2010%2010%2010.9967%2010%2012.2222V27.7778C10%2029.0033%2010.9967%2030%2012.2222%2030H27.7778C29.0033%2030%2030%2029.0033%2030%2027.7778V12.2222C30%2010.9967%2029.0033%2010%2027.7778%2010ZM12.2222%2027.7778V12.2222H27.7778L27.78%2027.7778H12.2222Z'%20fill='%23D3D5D7'/%3e%3cpath%20d='M17.7778%2022.2222L16.6667%2021.1111L13.3333%2025.5556H26.6667L21.1111%2017.7778L17.7778%2022.2222Z'%20fill='%23D3D5D7'/%3e%3cpath%20d='M16.1111%2018.8889C17.0316%2018.8889%2017.7778%2018.1427%2017.7778%2017.2222C17.7778%2016.3017%2017.0316%2015.5556%2016.1111%2015.5556C15.1906%2015.5556%2014.4444%2016.3017%2014.4444%2017.2222C14.4444%2018.1427%2015.1906%2018.8889%2016.1111%2018.8889Z'%20fill='%23D3D5D7'/%3e%3c/svg%3e",
        "transferSupported": 0,
        "lookupSupported": 0
    },
    {
        "id": 97,
        "name": "ANZBANK",
        "code": "ANZ",
        "bin": "",
        "shortName": "ANZBANK",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/ANZBANK-D6QkNkOP.svg",
        "transferSupported": 0,
        "lookupSupported": 0
    },
    {
        "id": 64,
        "name": "Ngân hàng Bangkok Bank",
        "code": "BANGKOK",
        "bin": "",
        "shortName": "BANGKOK",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/Bangkok-ezUqldDy.svg",
        "transferSupported": 0,
        "lookupSupported": 0
    },
    {
        "id": 63,
        "name": "Ngân hàng Bank of Communications - Chi nhánh Thành phố Hồ Chí Minh",
        "code": "BANKCOMM",
        "bin": "",
        "shortName": "BANKCOMM",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/BankComm-CEK6_fUh.svg",
        "transferSupported": 0,
        "lookupSupported": 0
    },
    {
        "id": 5,
        "name": "Ngân hàng TMCP Bảo Việt",
        "code": "BVB",
        "bin": "970438",
        "shortName": "BaoVietBank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/BaoViet-By-X-2So.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 53,
        "name": "TMCP Việt Nam Thịnh Vượng - Ngân hàng số CAKE by VPBank",
        "code": "CAKE",
        "bin": "546034",
        "shortName": "CAKE",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/Cake-uD54Wg60.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 6,
        "name": "Ngân hàng Thương mại TNHH MTV Xây dựng Việt Nam",
        "code": "CBB",
        "bin": "970444",
        "shortName": "CBBank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/CB-D5NyDqwJ.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 7,
        "name": "Ngân hàng TNHH MTV CIMB Việt Nam",
        "code": "CIMB",
        "bin": "422589",
        "shortName": "CIMB",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/CIMB-C06oiZmS.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 60,
        "name": "Ngân hàng Citibank Việt Nam",
        "code": "CITIBANK",
        "bin": "",
        "shortName": "CITIBANK",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/CitiBank-CE0bIgqv.svg",
        "transferSupported": 0,
        "lookupSupported": 0
    },
    {
        "id": 52,
        "name": "Ngân hàng Hợp tác xã Việt Nam",
        "code": "COOPBANK",
        "bin": "",
        "shortName": "COOPBANK",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/Coop-C4OX9HtU.svg",
        "transferSupported": 0,
        "lookupSupported": 0
    },
    {
        "id": 9,
        "name": "Ngân hàng TMCP Đông Á",
        "code": "DAB",
        "bin": "970406",
        "shortName": "DongABank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/DongA-BrOPSxz3.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 10,
        "name": "Ngân hàng TMCP Xuất Nhập khẩu Việt Nam",
        "code": "EIB",
        "bin": "970431",
        "shortName": "Eximbank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/Exim-jwRxwsdw.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 11,
        "name": "Ngân hàng Thương mại TNHH MTV Dầu Khí Toàn Cầu",
        "code": "GPB",
        "bin": "970408",
        "shortName": "GPBank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/GP-CYlv39Sd.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 14,
        "name": "Ngân hàng TNHH MTV HSBC (Việt Nam)",
        "code": "HSBC",
        "bin": "458761",
        "shortName": "HSBC",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/HSBC-bUGxdQx8.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 13,
        "name": "Ngân hàng TNHH MTV Hong Leong Việt Nam",
        "code": "HLBVN",
        "bin": "970442",
        "shortName": "HongLeong",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/HongLeong-BgK3aDVU.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 18,
        "name": "Ngân hàng TNHH Indovina",
        "code": "IVB",
        "bin": "970434",
        "shortName": "IndovinaBank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/IVB-DN1mh_XG.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 55,
        "name": "Ngân hàng Đại chúng TNHH Kasikornbank",
        "code": "KBANK",
        "bin": "668888",
        "shortName": "KBank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/KBank-BWNwyMGo.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 19,
        "name": "Ngân hàng TMCP Kiên Long",
        "code": "KLB",
        "bin": "970452",
        "shortName": "KienLongBank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/KienLong-Kkoi2ZB-.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 20,
        "name": "Ngân hàng TMCP Bưu Điện Liên Việt",
        "code": "LPB",
        "bin": "970449",
        "shortName": "LienVietPostBank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/LVPB-Dh9C0I2G.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 22,
        "name": "Ngân hàng TMCP Hàng Hải",
        "code": "MSB",
        "bin": "970426",
        "shortName": "MSB",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/MSB-dlO-RFRx.svg",
        "transferSupported": 1,
        "color": "#ea5225",
        "lookupSupported": 1
    },
    {
        "id": 23,
        "name": "Ngân hàng TMCP Nam Á",
        "code": "NAB",
        "bin": "970428",
        "shortName": "NamABank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/NamA-T9Q1PAqN.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 24,
        "name": "Ngân hàng TMCP Quốc Dân",
        "code": "NCB",
        "bin": "970419",
        "shortName": "NCB",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/NCB-CnTW5zG8.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 26,
        "name": "Ngân hàng TMCP Phương Đông",
        "code": "OCB",
        "bin": "970448",
        "shortName": "OCB",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/OCB-BhuOpSut.svg",
        "transferSupported": 1,
        "color": "#008842",
        "lookupSupported": 1
    },
    {
        "id": 27,
        "name": "Ngân hàng Thương mại TNHH MTV Đại Dương",
        "code": "OJB",
        "bin": "970414",
        "shortName": "Oceanbank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/OceanBank-DpksFvsf.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 29,
        "name": "Ngân hàng TMCP Xăng dầu Petrolimex",
        "code": "PGB",
        "bin": "970430",
        "shortName": "PGBank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/PGB-CLdVrkq2.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 30,
        "name": "Ngân hàng TMCP Đại Chúng Việt Nam",
        "code": "PVCB",
        "bin": "970439",
        "shortName": "PVcomBank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/PVC-DaNblFu7.svg",
        "transferSupported": 1,
        "color": "#eab80d",
        "lookupSupported": 1
    },
    {
        "id": 28,
        "name": "Ngân hàng TNHH MTV Public Việt Nam",
        "code": "PBVN",
        "bin": "970439",
        "shortName": "PublicBank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/PublicBank-FXQzvoO6.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 95,
        "name": "Ngân hàng Sài Gòn Bank",
        "code": "SGB",
        "bin": "970400",
        "shortName": "SAIGONBANK",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/SGonBank-D6r_YVsi.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 31,
        "name": "Ngân hàng TMCP Sài Gòn",
        "code": "SCB",
        "bin": "970429",
        "shortName": "SCB",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/SCB-DEGsdZDd.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 35,
        "name": "Ngân hàng TMCP Sài Gòn - Hà Nội",
        "code": "SHB",
        "bin": "970443",
        "shortName": "SHB",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/SHB-BnAm5XWx.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 36,
        "name": "Ngân hàng TMCP Sài Gòn Thương Tín",
        "code": "STB",
        "bin": "970403",
        "shortName": "Sacombank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/Sacom-BaHN6IkM.svg",
        "transferSupported": 1,
        "color": "#006fb8",
        "lookupSupported": 1
    },
    {
        "id": 34,
        "name": "Ngân hàng TMCP Sài Gòn Công Thương",
        "code": "SGB",
        "bin": "970400",
        "shortName": "SaigonBank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/SGonBank-D6r_YVsi.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 33,
        "name": "Ngân hàng TMCP Đông Nam Á",
        "code": "SEAB",
        "bin": "970440",
        "shortName": "SeABank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/SeABank-DNUl8MFJ.svg",
        "transferSupported": 1,
        "color": "#d01f26",
        "lookupSupported": 1
    },
    {
        "id": 37,
        "name": "Ngân hàng TNHH MTV Shinhan Việt Nam",
        "code": "SHINHAN",
        "bin": "970424",
        "shortName": "ShinhanBank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/Shinhan-Dp9G8OwO.svg",
        "transferSupported": 1,
        "color": "#0c3b95",
        "lookupSupported": 1
    },
    {
        "id": 32,
        "name": "Ngân hàng TNHH MTV Standard Chartered Bank Việt Nam",
        "code": "SCVN",
        "bin": "970410",
        "shortName": "StandardChartered",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/Standard-C1I9BiVo.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 58,
        "name": "Ngân hàng số Timo by Ban Viet Bank",
        "code": "TIMO",
        "bin": "961026",
        "shortName": "Timo",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/timo-BNmku7T0.svg",
        "transferSupported": 1,
        "color": "#6e3ba7",
        "lookupSupported": 1
    },
    {
        "id": 54,
        "name": "TMCP Việt Nam Thịnh Vượng - Ngân hàng số Ubank by VPBank",
        "code": "UBANK",
        "bin": "546035",
        "shortName": "Ubank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/UBank-DlWb25ty.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 40,
        "name": "Ngân hàng United Overseas - Chi nhánh TP. Hồ Chí Minh",
        "code": "UOB",
        "bin": "970458",
        "shortName": "UnitedOverseas",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/UnitedOverseas-Ba40pZgO.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 56,
        "name": "VNPT Money",
        "code": "VNPTMONEY",
        "bin": "971005",
        "shortName": "VNPTMoney",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/VNPT-COis-QZ5.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 47,
        "name": "Ngân hàng TMCP Việt Nam Thịnh Vượng",
        "code": "VPB",
        "bin": "970432",
        "shortName": "VPBank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/VPB-DI4g1v9W.svg",
        "transferSupported": 1,
        "color": "#00b14f",
        "lookupSupported": 1
    },
    {
        "id": 48,
        "name": "Ngân hàng Liên doanh Việt - Nga",
        "code": "VRB",
        "bin": "970421",
        "shortName": "VRB",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/VRB-BRrfM3An.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 41,
        "name": "Ngân hàng TMCP Việt Á",
        "code": "VAB",
        "bin": "970427",
        "shortName": "VietABank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/VietA-Du_5amVD.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 46,
        "name": "Ngân hàng TMCP Việt Nam Thương Tín",
        "code": "VB",
        "bin": "970433",
        "shortName": "VietBank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/VietBank-PUfAlhG7.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 44,
        "name": "Ngân hàng TMCP Bản Việt",
        "code": "VCCB",
        "bin": "970454",
        "shortName": "VietCapitalBank",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/Vietcapital-BUHCkL6J.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 57,
        "name": "Viettel Money",
        "code": "VIETTELMONEY",
        "bin": "971011",
        "shortName": "ViettelMoney",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/Viettel-DIW8jhuL.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    },
    {
        "id": 49,
        "name": "Ngân hàng TNHH MTV Woori Việt Nam",
        "code": "WOORI",
        "bin": "970457",
        "shortName": "Woori",
        "logo": "https://bizweb.sapocdn.net/dev/admin/frontend/assets/worri-B9dhcv7G.svg",
        "transferSupported": 1,
        "lookupSupported": 1
    }
];
