// Congressional reports (House Reports and Senate Reports) that address
// amendments to specific sections of Title 17 (Copyrights).
//
// Each entry maps a report to the Public Law it accompanied and the Title 17
// sections it discusses.  Where a freely-available PDF exists the `url` field
// points there; otherwise it falls back to a Google search for the report.

export interface CongressionalReport {
  type: 'house' | 'senate' | 'conference';
  number: string;        // e.g. "94-1476"
  congress: number;
  title: string;         // short descriptive name
  publicLaw: string;     // e.g. "94-553"
  lawName: string;       // popular name of the law
  year: number;
  url: string;           // direct link to PDF or reliable source, or Google search
  sections: string[];    // Title 17 section numbers affected
}

// Helper – build a Google search URL for a report when no direct link exists.
function googleSearch(report: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(report)}`;
}

export const congressionalReports: CongressionalReport[] = [
  // ───────────────────────────────────────────────────────────────────────────
  // Copyright Act of 1976 — Pub. L. 94-553
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '94-1476',
    congress: 94,
    title: 'Copyright Law Revision',
    publicLaw: '94-553',
    lawName: 'Copyright Act of 1976',
    year: 1976,
    url: 'https://www.copyright.gov/history/law/clrev_94-1476.pdf',
    sections: [
      '101','102','103','104','105','106','107','108','109','110',
      '111','112','113','114','115','116','117','118',
      '201','202','203','204','205',
      '301','302','303','304','305',
      '401','402','403','404','405','406','407','408','409','410','411','412',
      '501','502','503','504','505','506','507','508','509','510',
      '601','602','603',
      '701','702','703','704','705','706','707','708','709',
      '801','802','803','804','805','806','807','808','809','810',
    ],
  },
  {
    type: 'senate',
    number: '94-473',
    congress: 94,
    title: 'Copyright Law Revision',
    publicLaw: '94-553',
    lawName: 'Copyright Act of 1976',
    year: 1975,
    url: googleSearch('S. Rept. 94-473 Copyright Law Revision'),
    sections: [
      '101','102','103','104','105','106','107','108','109','110',
      '111','112','113','114','115','116','117','118',
      '201','202','203','204','205',
      '301','302','303','304','305',
      '401','402','403','404','405','406','407','408','409','410','411','412',
      '501','502','503','504','505','506','507','508','509','510',
      '601','602','603',
      '701','702','703','704','705','706','707','708','709',
      '801','802','803','804','805','806','807','808','809','810',
    ],
  },
  {
    type: 'conference',
    number: '94-1733',
    congress: 94,
    title: 'Copyright Act of 1976 — Conference Report',
    publicLaw: '94-553',
    lawName: 'Copyright Act of 1976',
    year: 1976,
    url: googleSearch('H. Rept. 94-1733 Copyright Act conference report'),
    sections: [
      '101','102','103','104','105','106','107','108','109','110',
      '111','112','113','114','115','116','117','118',
      '201','202','203','204','205',
      '301','302','303','304','305',
      '401','402','403','404','405','406','407','408','409','410','411','412',
      '501','502','503','504','505','506','507','508','509','510',
      '601','602','603',
      '701','702','703','704','705','706','707','708','709',
      '801','802','803','804','805','806','807','808','809','810',
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Computer Software Copyright Act of 1980 — Pub. L. 96-517
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '96-1307',
    congress: 96,
    title: 'Computer Software Copyright Act',
    publicLaw: '96-517',
    lawName: 'Computer Software Copyright Act of 1980',
    year: 1980,
    url: googleSearch('H. Rept. 96-1307 Computer Software Copyright Act'),
    sections: ['101', '117'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Piracy and Counterfeiting Amendments Act of 1982 — Pub. L. 97-180
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '97-495',
    congress: 97,
    title: 'Piracy and Counterfeiting Amendments Act',
    publicLaw: '97-180',
    lawName: 'Piracy and Counterfeiting Amendments Act of 1982',
    year: 1982,
    url: googleSearch('H. Rept. 97-495 Piracy Counterfeiting Amendments Act'),
    sections: ['506'],
  },
  {
    type: 'senate',
    number: '97-274',
    congress: 97,
    title: 'Piracy and Counterfeiting Amendments Act',
    publicLaw: '97-180',
    lawName: 'Piracy and Counterfeiting Amendments Act of 1982',
    year: 1981,
    url: googleSearch('S. Rept. 97-274 Piracy Counterfeiting Amendments Act'),
    sections: ['506'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Record Rental Amendment of 1984 — Pub. L. 98-450
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '98-987',
    congress: 98,
    title: 'Record Rental Amendment Act',
    publicLaw: '98-450',
    lawName: 'Record Rental Amendment of 1984',
    year: 1984,
    url: googleSearch('H. Rept. 98-987 Record Rental Amendment'),
    sections: ['109', '115'],
  },
  {
    type: 'senate',
    number: '98-162',
    congress: 98,
    title: 'Record Rental Amendment Act',
    publicLaw: '98-450',
    lawName: 'Record Rental Amendment of 1984',
    year: 1983,
    url: googleSearch('S. Rept. 98-162 Record Rental Amendment'),
    sections: ['109', '115'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Semiconductor Chip Protection Act of 1984 — Pub. L. 98-620
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '98-781',
    congress: 98,
    title: 'Semiconductor Chip Protection Act',
    publicLaw: '98-620',
    lawName: 'Semiconductor Chip Protection Act of 1984',
    year: 1984,
    url: 'https://www.govinfo.gov/content/pkg/SERIALSET-13591_00_00-034-0781-0000/pdf/SERIALSET-13591_00_00-034-0781-0000.pdf',
    sections: ['901','902','903','904','905','906','907','908','909','910','911','912','913','914'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Pub. L. 99-397 (1986) — Cable copyright / LPTV amendment
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '99-615',
    congress: 99,
    title: 'Cable Copyright / LPTV Amendment',
    publicLaw: '99-397',
    lawName: 'Cable Copyright / LPTV Amendment of 1986',
    year: 1986,
    url: googleSearch('H. Rept. 99-615 copyright cable LPTV 1986'),
    sections: ['111', '801'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Berne Convention Implementation Act of 1988 — Pub. L. 100-568
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '100-609',
    congress: 100,
    title: 'Berne Convention Implementation Act',
    publicLaw: '100-568',
    lawName: 'Berne Convention Implementation Act of 1988',
    year: 1988,
    url: 'https://www.govinfo.gov/content/pkg/CRPT-100hrpt609/pdf/CRPT-100hrpt609.pdf',
    sections: ['101','104','116','205','301','401','402','403','404','405','406','407','408','411','501','504','801','804'],
  },
  {
    type: 'senate',
    number: '100-352',
    congress: 100,
    title: 'Berne Convention Implementation Act',
    publicLaw: '100-568',
    lawName: 'Berne Convention Implementation Act of 1988',
    year: 1988,
    url: googleSearch('S. Rept. 100-352 Berne Convention Implementation Act'),
    sections: ['101','104','116','205','301','401','402','403','404','405','406','407','408','411','501','504','801','804'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Satellite Home Viewer Act of 1988 — Pub. L. 100-667
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '100-887',
    congress: 100,
    title: 'Satellite Home Viewer Act',
    publicLaw: '100-667',
    lawName: 'Satellite Home Viewer Act of 1988',
    year: 1988,
    url: googleSearch('H. Rept. 100-887 Satellite Home Viewer Act 1988'),
    sections: ['111', '119', '501', '801', '804'],
  },
  {
    type: 'senate',
    number: '100-515',
    congress: 100,
    title: 'Satellite Home Viewer Act',
    publicLaw: '100-667',
    lawName: 'Satellite Home Viewer Act of 1988',
    year: 1988,
    url: googleSearch('S. Rept. 100-515 Satellite Home Viewer Act 1988'),
    sections: ['111', '119', '501', '801', '804'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Copyright Fees and Technical Amendments Act of 1989 — Pub. L. 101-318
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '101-267',
    congress: 101,
    title: 'Copyright Fees and Technical Amendments Act',
    publicLaw: '101-318',
    lawName: 'Copyright Fees and Technical Amendments Act of 1989',
    year: 1989,
    url: googleSearch('H. Rept. 101-267 Copyright Fees Technical Amendments Act'),
    sections: ['106', '111', '704', '708', '801', '804'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Copyright Royalty Tribunal Reform and Miscellaneous Pay Act — Pub. L. 101-319
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '101-268',
    congress: 101,
    title: 'Copyright Royalty Tribunal Reform and Miscellaneous Pay Act',
    publicLaw: '101-319',
    lawName: 'Copyright Royalty Tribunal Reform and Miscellaneous Pay Act of 1989',
    year: 1989,
    url: googleSearch('H. Rept. 101-268 Copyright Royalty Tribunal Reform Pay Act'),
    sections: ['701', '802'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Copyright Remedy Clarification Act — Pub. L. 101-553
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '101-282',
    congress: 101,
    title: 'Copyright Remedy Clarification Act',
    publicLaw: '101-553',
    lawName: 'Copyright Remedy Clarification Act of 1990',
    year: 1989,
    url: googleSearch('H. Rept. 101-282 Copyright Remedy Clarification Act'),
    sections: ['501', '511', '910', '911'],
  },
  {
    type: 'senate',
    number: '101-305',
    congress: 101,
    title: 'Copyright Remedy Clarification Act',
    publicLaw: '101-553',
    lawName: 'Copyright Remedy Clarification Act of 1990',
    year: 1990,
    url: googleSearch('S. Rept. 101-305 Copyright Remedy Clarification Act'),
    sections: ['501', '511', '910', '911'],
  },
  {
    type: 'conference',
    number: '101-887',
    congress: 101,
    title: 'Copyright Remedy Clarification Act — Conference Report',
    publicLaw: '101-553',
    lawName: 'Copyright Remedy Clarification Act of 1990',
    year: 1990,
    url: googleSearch('H. Rept. 101-887 Copyright Remedy Clarification Act conference'),
    sections: ['501', '511', '910', '911'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Visual Artists Rights Act of 1990 (VARA) — Pub. L. 101-650 (Title VI)
  // Architectural Works Copyright Protection Act — Pub. L. 101-650 (Title VII)
  // Copyright Renewal Act — Pub. L. 101-650 (Title IV)
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '101-514',
    congress: 101,
    title: 'Visual Artists Rights Act (VARA)',
    publicLaw: '101-650',
    lawName: 'Visual Artists Rights Act of 1990',
    year: 1990,
    url: 'https://www.congress.gov/committee-report/101st-congress/house-report/514',
    sections: ['101','102','106','106A','107','113','301','411','412','501','506'],
  },
  {
    type: 'house',
    number: '101-735',
    congress: 101,
    title: 'Copyright Amendments Act of 1990',
    publicLaw: '101-650',
    lawName: 'Copyright Amendments Act of 1990',
    year: 1990,
    url: 'https://www.copyright.gov/reports/copyright-amendments-act-of-1990.pdf',
    sections: ['101','102','106','106A','107','109','113','120','301','411','412','501','506'],
  },
  {
    type: 'senate',
    number: '101-265',
    congress: 101,
    title: 'Visual Artists Rights Act (VARA)',
    publicLaw: '101-650',
    lawName: 'Visual Artists Rights Act of 1990',
    year: 1990,
    url: googleSearch('S. Rept. 101-265 Visual Artists Rights Act VARA'),
    sections: ['101','102','106','106A','107','113','301','411','412','501','506'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Fair Use of Unpublished Works — Pub. L. 102-492
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '102-836',
    congress: 102,
    title: 'Fair Use of Unpublished Works',
    publicLaw: '102-492',
    lawName: 'Fair Use of Unpublished Works Amendment',
    year: 1992,
    url: googleSearch('H. Rept. 102-836 fair use unpublished works copyright'),
    sections: ['107'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Copyright Renewal Act of 1992 — Pub. L. 102-307
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '102-379',
    congress: 102,
    title: 'Copyright Renewal Act',
    publicLaw: '102-307',
    lawName: 'Copyright Renewal Act of 1992',
    year: 1992,
    url: googleSearch('H. Rept. 102-379 Copyright Renewal Act 1992'),
    sections: ['101', '304', '408', '409', '708'],
  },
  {
    type: 'senate',
    number: '102-194',
    congress: 102,
    title: 'Copyright Renewal Act',
    publicLaw: '102-307',
    lawName: 'Copyright Renewal Act of 1992',
    year: 1992,
    url: googleSearch('S. Rept. 102-194 Copyright Renewal Act 1992'),
    sections: ['101', '304', '408', '409', '708'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Audio Home Recording Act of 1992 — Pub. L. 102-563
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '102-873',
    congress: 102,
    title: 'Audio Home Recording Act',
    publicLaw: '102-563',
    lawName: 'Audio Home Recording Act of 1992',
    year: 1992,
    url: 'https://ipmall.info/sites/default/files/hosted_resources/lipa/copyrights/The%20House%20Report%20on%20the%20Audio%20Home%20Recording%20Act%20of%201992.pdf',
    sections: ['101','801','804','912','1001','1002','1003','1004','1005','1006','1007','1008','1009','1010'],
  },
  {
    type: 'senate',
    number: '102-294',
    congress: 102,
    title: 'Audio Home Recording Act',
    publicLaw: '102-563',
    lawName: 'Audio Home Recording Act of 1992',
    year: 1992,
    url: googleSearch('S. Rept. 102-294 Audio Home Recording Act'),
    sections: ['101','801','804','912','1001','1002','1003','1004','1005','1006','1007','1008','1009','1010'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Copyright Royalty Tribunal Reform Act of 1993 — Pub. L. 103-198
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '103-286',
    congress: 103,
    title: 'Copyright Royalty Tribunal Reform Act',
    publicLaw: '103-198',
    lawName: 'Copyright Royalty Tribunal Reform Act of 1993',
    year: 1993,
    url: googleSearch('H. Rept. 103-286 Copyright Royalty Tribunal Reform Act'),
    sections: ['111', '116', '118', '119', '801', '802', '803', '1004', '1005', '1006', '1007', '1010'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Satellite Home Viewer Act of 1994 — Pub. L. 103-369
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '103-703',
    congress: 103,
    title: 'Satellite Home Viewer Act of 1994',
    publicLaw: '103-369',
    lawName: 'Satellite Home Viewer Act of 1994',
    year: 1994,
    url: googleSearch('H. Rept. 103-703 Satellite Home Viewer Act 1994'),
    sections: ['111', '119'],
  },
  {
    type: 'senate',
    number: '103-407',
    congress: 103,
    title: 'Satellite Home Viewer Act of 1994',
    publicLaw: '103-369',
    lawName: 'Satellite Home Viewer Act of 1994',
    year: 1994,
    url: googleSearch('S. Rept. 103-407 Satellite Home Viewer Act 1994'),
    sections: ['111', '119'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Uruguay Round Agreements Act — Pub. L. 103-465
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '103-826',
    congress: 103,
    title: 'Uruguay Round Agreements Act',
    publicLaw: '103-465',
    lawName: 'Uruguay Round Agreements Act',
    year: 1994,
    url: googleSearch('H. Rept. 103-826 Uruguay Round Agreements Act'),
    sections: ['104A', '109', '1101'],
  },
  {
    type: 'senate',
    number: '103-412',
    congress: 103,
    title: 'Uruguay Round Agreements Act',
    publicLaw: '103-465',
    lawName: 'Uruguay Round Agreements Act',
    year: 1994,
    url: googleSearch('S. Rept. 103-412 Uruguay Round Agreements Act'),
    sections: ['104A', '109', '1101'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Digital Performance Right in Sound Recordings Act of 1995 — Pub. L. 104-39
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '104-274',
    congress: 104,
    title: 'Digital Performance Right in Sound Recordings Act',
    publicLaw: '104-39',
    lawName: 'Digital Performance Right in Sound Recordings Act of 1995',
    year: 1995,
    url: 'https://www.govinfo.gov/content/pkg/CRPT-104hrpt274/pdf/CRPT-104hrpt274.pdf',
    sections: ['101', '106', '111', '114', '115', '119', '801', '802', '803'],
  },
  {
    type: 'senate',
    number: '104-128',
    congress: 104,
    title: 'Digital Performance Right in Sound Recordings Act',
    publicLaw: '104-39',
    lawName: 'Digital Performance Right in Sound Recordings Act of 1995',
    year: 1995,
    url: 'https://www.govinfo.gov/content/pkg/CRPT-104srpt128/pdf/CRPT-104srpt128.pdf',
    sections: ['101', '106', '111', '114', '115', '119', '801', '802', '803'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Anticounterfeiting Consumer Protection Act of 1996 — Pub. L. 104-153
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '104-556',
    congress: 104,
    title: 'Anticounterfeiting Consumer Protection Act',
    publicLaw: '104-153',
    lawName: 'Anticounterfeiting Consumer Protection Act of 1996',
    year: 1996,
    url: googleSearch('H. Rept. 104-556 Anticounterfeiting Consumer Protection Act'),
    sections: ['603'],
  },
  {
    type: 'senate',
    number: '104-177',
    congress: 104,
    title: 'Anticounterfeiting Consumer Protection Act',
    publicLaw: '104-153',
    lawName: 'Anticounterfeiting Consumer Protection Act of 1996',
    year: 1995,
    url: googleSearch('S. Rept. 104-177 Anticounterfeiting Consumer Protection Act'),
    sections: ['603'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Copyright Technical Amendments Act — Pub. L. 105-80
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '105-25',
    congress: 105,
    title: 'Copyright Technical Amendments Act',
    publicLaw: '105-80',
    lawName: 'Copyright Technical Amendments Act of 1997',
    year: 1997,
    url: 'https://www.congress.gov/committee-report/105th-congress/house-report/25',
    sections: ['101','108','109','114','115','116','303','304','405','407','411','504','708'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // No Electronic Theft (NET) Act — Pub. L. 105-147
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '105-339',
    congress: 105,
    title: 'No Electronic Theft (NET) Act',
    publicLaw: '105-147',
    lawName: 'No Electronic Theft (NET) Act',
    year: 1997,
    url: 'https://www.govinfo.gov/content/pkg/CRPT-105hrpt339/pdf/CRPT-105hrpt339.pdf',
    sections: ['101', '506', '507'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Sonny Bono Copyright Term Extension Act — Pub. L. 105-298 (Title I)
  // Fairness in Music Licensing Act — Pub. L. 105-298 (Title II)
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '105-452',
    congress: 105,
    title: 'Copyright Term Extension Act',
    publicLaw: '105-298',
    lawName: 'Sonny Bono Copyright Term Extension Act',
    year: 1998,
    url: 'https://www.congress.gov/committee-report/105th-congress/house-report/452',
    sections: ['101','108','110','203','301','302','303','304','504','513'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Digital Millennium Copyright Act (DMCA) — Pub. L. 105-304
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '105-551',
    congress: 105,
    title: 'WIPO Copyright Treaties Implementation / DMCA (Part 1)',
    publicLaw: '105-304',
    lawName: 'Digital Millennium Copyright Act',
    year: 1998,
    url: 'https://www.govinfo.gov/content/pkg/CRPT-105hrpt551/pdf/CRPT-105hrpt551-pt1.pdf',
    sections: [
      '101','104','104A','108','112','114','117','411','507','512','701',
      '1201','1202','1203','1204','1205',
      '1301','1302','1303','1304','1305','1306','1307','1308','1309','1310',
      '1311','1312','1313','1314','1315','1316','1317','1318','1319','1320',
      '1321','1322','1323','1324','1325','1326','1327','1328','1329','1330','1331','1332',
    ],
  },
  {
    type: 'house',
    number: '105-551 pt. 2',
    congress: 105,
    title: 'DMCA (Part 2 — Commerce Committee)',
    publicLaw: '105-304',
    lawName: 'Digital Millennium Copyright Act',
    year: 1998,
    url: 'https://www.govinfo.gov/content/pkg/CRPT-105hrpt551/pdf/CRPT-105hrpt551-pt2.pdf',
    sections: [
      '101','104','104A','108','112','114','117','411','507','512','701',
      '1201','1202','1203','1204','1205',
      '1301','1302','1303','1304','1305','1306','1307','1308','1309','1310',
      '1311','1312','1313','1314','1315','1316','1317','1318','1319','1320',
      '1321','1322','1323','1324','1325','1326','1327','1328','1329','1330','1331','1332',
    ],
  },
  {
    type: 'senate',
    number: '105-190',
    congress: 105,
    title: 'Digital Millennium Copyright Act',
    publicLaw: '105-304',
    lawName: 'Digital Millennium Copyright Act',
    year: 1998,
    url: 'https://www.congress.gov/committee-report/105th-congress/senate-report/190',
    sections: [
      '101','104','104A','108','112','114','117','411','507','512','701',
      '1201','1202','1203','1204','1205',
      '1301','1302','1303','1304','1305','1306','1307','1308','1309','1310',
      '1311','1312','1313','1314','1315','1316','1317','1318','1319','1320',
      '1321','1322','1323','1324','1325','1326','1327','1328','1329','1330','1331','1332',
    ],
  },
  {
    type: 'conference',
    number: '105-796',
    congress: 105,
    title: 'Digital Millennium Copyright Act — Conference Report',
    publicLaw: '105-304',
    lawName: 'Digital Millennium Copyright Act',
    year: 1998,
    url: 'https://www.congress.gov/committee-report/105th-congress/house-report/796',
    sections: [
      '101','104','104A','108','112','114','117','411','507','512','701',
      '1201','1202','1203','1204','1205',
      '1301','1302','1303','1304','1305','1306','1307','1308','1309','1310',
      '1311','1312','1313','1314','1315','1316','1317','1318','1319','1320',
      '1321','1322','1323','1324','1325','1326','1327','1328','1329','1330','1331','1332',
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Satellite Home Viewer Improvement Act of 1999 — Pub. L. 106-113
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'senate',
    number: '106-42',
    congress: 106,
    title: 'Satellite Home Viewer Improvement Act',
    publicLaw: '106-113',
    lawName: 'Satellite Home Viewer Improvement Act of 1999',
    year: 1999,
    url: 'https://www.congress.gov/committee-report/106th-congress/senate-report/42',
    sections: ['101', '111', '119', '122', '510', '501'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Technical Corrections to Copyright and Other Laws — Pub. L. 106-44
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '106-84',
    congress: 106,
    title: 'Technical Corrections to Copyright and Other Laws',
    publicLaw: '106-44',
    lawName: 'Technical Corrections to Copyright Laws of 1999',
    year: 1999,
    url: 'https://www.congress.gov/committee-report/106th-congress/house-report/84',
    sections: ['101','106','110','112','118','119','501','511','512','513','1202','1302','1320'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Pub. L. 106-160 (1999) — Increased statutory damages
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '106-216',
    congress: 106,
    title: 'Copyright Damages Improvement Act',
    publicLaw: '106-160',
    lawName: 'Copyright Damages Improvement Act of 1999',
    year: 1999,
    url: googleSearch('H. Rept. 106-216 Copyright Damages Improvement Act'),
    sections: ['504'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Work Made for Hire / Copyright Corrections — Pub. L. 106-379
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '106-861',
    congress: 106,
    title: 'Work Made for Hire and Copyright Corrections Act',
    publicLaw: '106-379',
    lawName: 'Work Made for Hire and Copyright Corrections Act of 2000',
    year: 2000,
    url: 'https://www.congress.gov/committee-report/106th-congress/house-report/861',
    sections: ['101', '121', '705', '708'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Intellectual Property and High Technology Technical Amendments — Pub. L. 107-273
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '107-240',
    congress: 107,
    title: 'Intellectual Property and High Technology Technical Amendments Act',
    publicLaw: '107-273',
    lawName: '21st Century Department of Justice Appropriations Authorization Act (Title III)',
    year: 2002,
    url: googleSearch('H. Rept. 107-240 Intellectual Property High Technology Technical Amendments'),
    sections: ['101','106','110','112','118','119','121','122','203','304','501','511'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Copyright Royalty and Distribution Reform Act of 2004 — Pub. L. 108-419
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '108-408',
    congress: 108,
    title: 'Copyright Royalty and Distribution Reform Act',
    publicLaw: '108-419',
    lawName: 'Copyright Royalty and Distribution Reform Act of 2004',
    year: 2004,
    url: googleSearch('H. Rept. 108-408 Copyright Royalty Distribution Reform Act'),
    sections: ['101','111','112','114','115','116','118','119','801','802','803','804','805','1004','1006','1007','1010'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Satellite Home Viewer Extension and Reauthorization Act of 2004
  // (part of Pub. L. 108-447)
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '108-660',
    congress: 108,
    title: 'Satellite Home Viewer Extension and Reauthorization Act',
    publicLaw: '108-447',
    lawName: 'Satellite Home Viewer Extension and Reauthorization Act of 2004',
    year: 2004,
    url: 'https://www.congress.gov/committee-report/108th-congress/house-report/660',
    sections: ['111', '119', '122', '803'],
  },
  {
    type: 'house',
    number: '108-634',
    congress: 108,
    title: 'Satellite Home Viewer Extension and Reauthorization Act (Energy/Commerce)',
    publicLaw: '108-447',
    lawName: 'Satellite Home Viewer Extension and Reauthorization Act of 2004',
    year: 2004,
    url: 'https://www.congress.gov/committee-report/108th-congress/house-report/634',
    sections: ['111', '119', '122', '803'],
  },
  {
    type: 'senate',
    number: '108-427',
    congress: 108,
    title: 'Satellite Home Viewer Extension and Rural Consumer Access to Digital Television Act',
    publicLaw: '108-447',
    lawName: 'Satellite Home Viewer Extension and Reauthorization Act of 2004',
    year: 2004,
    url: 'https://www.congress.gov/committee-report/108th-congress/senate-report/427',
    sections: ['111', '119', '122', '803'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Intellectual Property Protection and Courts Amendments Act of 2004 — Pub. L. 108-482
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '108-600',
    congress: 108,
    title: 'Intellectual Property Protection and Courts Amendments Act',
    publicLaw: '108-482',
    lawName: 'Intellectual Property Protection and Courts Amendments Act of 2004',
    year: 2004,
    url: googleSearch('H. Rept. 108-600 Intellectual Property Protection Courts Amendments'),
    sections: ['504'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Family Entertainment and Copyright Act of 2005 — Pub. L. 109-9
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '109-33',
    congress: 109,
    title: 'Family Entertainment and Copyright Act',
    publicLaw: '109-9',
    lawName: 'Family Entertainment and Copyright Act of 2005',
    year: 2005,
    url: 'https://www.govinfo.gov/content/pkg/CRPT-109hrpt33/pdf/CRPT-109hrpt33-pt1.pdf',
    sections: ['101', '108', '110', '408', '411', '412', '506'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Technical corrections / Copyright Royalty Judges — Pub. L. 109-303
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '109-64',
    congress: 109,
    title: 'Technical Corrections — Copyright Royalty Judges',
    publicLaw: '109-303',
    lawName: 'Copyright Royalty Judges Technical Corrections',
    year: 2006,
    url: 'https://www.congress.gov/committee-report/109th-congress/house-report/64',
    sections: ['111', '114', '115', '118', '119', '801', '802', '803', '804', '1007'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // PRO-IP Act of 2008 — Pub. L. 110-403
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '110-617',
    congress: 110,
    title: 'Prioritizing Resources and Organization for Intellectual Property (PRO-IP) Act',
    publicLaw: '110-403',
    lawName: 'PRO-IP Act of 2008',
    year: 2008,
    url: 'https://www.congress.gov/committee-report/110th-congress/house-report/617',
    sections: ['109','111','115','119','122','411','412','503','506','602'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Satellite Television Extension and Localism Act of 2010 (STELA) — Pub. L. 111-175
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '111-319',
    congress: 111,
    title: 'Satellite Home Viewer Update and Reauthorization Act',
    publicLaw: '111-175',
    lawName: 'Satellite Television Extension and Localism Act of 2010',
    year: 2010,
    url: 'https://www.congress.gov/committee-report/111th-congress/house-report/319',
    sections: ['111', '119', '122', '708', '804'],
  },
  {
    type: 'house',
    number: '111-349',
    congress: 111,
    title: 'Satellite Home Viewer Reauthorization Act (Commerce Committee)',
    publicLaw: '111-175',
    lawName: 'Satellite Television Extension and Localism Act of 2010',
    year: 2010,
    url: 'https://www.govinfo.gov/content/pkg/CRPT-111hrpt349/pdf/CRPT-111hrpt349.pdf',
    sections: ['111', '119', '122', '708', '804'],
  },
  {
    type: 'senate',
    number: '111-98',
    congress: 111,
    title: 'Satellite Television Modernization Act of 2009',
    publicLaw: '111-175',
    lawName: 'Satellite Television Extension and Localism Act of 2010',
    year: 2009,
    url: 'https://www.congress.gov/committee-report/111th-congress/senate-report/98',
    sections: ['111', '119', '122', '708', '804'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // STELA Reauthorization Act of 2014 — Pub. L. 113-200
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '113-518',
    congress: 113,
    title: 'STELA Reauthorization Act of 2014',
    publicLaw: '113-200',
    lawName: 'STELA Reauthorization Act of 2014',
    year: 2014,
    url: 'https://www.govinfo.gov/content/pkg/CRPT-113hrpt518/pdf/CRPT-113hrpt518.pdf',
    sections: ['111', '119', '122'],
  },
  {
    type: 'senate',
    number: '113-322',
    congress: 113,
    title: 'Satellite Television Access and Viewer Rights Act (STAVRA)',
    publicLaw: '113-200',
    lawName: 'STELA Reauthorization Act of 2014',
    year: 2014,
    url: 'https://www.congress.gov/committee-report/113th-congress/senate-report/322',
    sections: ['111', '119', '122'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Marrakesh Treaty Implementation Act — Pub. L. 115-261
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'senate',
    number: '115-261',
    congress: 115,
    title: 'Marrakesh Treaty Implementation Act',
    publicLaw: '115-261',
    lawName: 'Marrakesh Treaty Implementation Act',
    year: 2018,
    url: 'https://www.govinfo.gov/content/pkg/CRPT-115srpt261/pdf/CRPT-115srpt261.pdf',
    sections: ['121', '121A'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Music Modernization Act — Pub. L. 115-264
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '115-651',
    congress: 115,
    title: 'Music Modernization Act',
    publicLaw: '115-264',
    lawName: 'Orrin G. Hatch–Bob Goodlatte Music Modernization Act',
    year: 2018,
    url: 'https://www.govinfo.gov/content/pkg/CRPT-115hrpt651/pdf/CRPT-115hrpt651.pdf',
    sections: ['114','115','301','801','803','804','1401'],
  },
  {
    type: 'senate',
    number: '115-339',
    congress: 115,
    title: 'Music Modernization Act',
    publicLaw: '115-264',
    lawName: 'Orrin G. Hatch–Bob Goodlatte Music Modernization Act',
    year: 2018,
    url: 'https://www.congress.gov/committee-report/115th-congress/senate-report/339',
    sections: ['114','115','301','801','803','804','1401'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // CASE Act / Copyright Claims Board — Pub. L. 116-260 (Div. Q, Title II)
  // ───────────────────────────────────────────────────────────────────────────
  {
    type: 'house',
    number: '116-252',
    congress: 116,
    title: 'Copyright Alternative in Small-Claims Enforcement (CASE) Act',
    publicLaw: '116-260',
    lawName: 'CASE Act of 2020',
    year: 2019,
    url: 'https://www.congress.gov/committee-report/116th-congress/house-report/252',
    sections: [
      '1501','1502','1503','1504','1505','1506','1507','1508','1509','1510','1511',
    ],
  },
  {
    type: 'senate',
    number: '116-105',
    congress: 116,
    title: 'Copyright Alternative in Small-Claims Enforcement (CASE) Act',
    publicLaw: '116-260',
    lawName: 'CASE Act of 2020',
    year: 2019,
    url: 'https://www.congress.gov/committee-report/116th-congress/senate-report/105',
    sections: [
      '1501','1502','1503','1504','1505','1506','1507','1508','1509','1510','1511',
    ],
  },
];

/**
 * Return all congressional reports that mention a given Title 17 section.
 */
export function getReportsForSection(sectionNum: string): CongressionalReport[] {
  return congressionalReports.filter(r => r.sections.includes(sectionNum));
}
