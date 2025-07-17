export interface StateTaxRequirement {
  state: string;
  entityTypes: {
    llc: {
      form: string;
      dueDate: string;
      extension?: string;
      notes?: string;
    };
    sCorp: {
      form: string;
      dueDate: string;
      extension?: string;
      notes?: string;
    };
    corporation: {
      form: string;
      dueDate: string;
      extension?: string;
      notes?: string;
    };
    soleProprietor: {
      form: string;
      dueDate: string;
      extension?: string;
      notes?: string;
    };
  };
}

export const stateTaxRequirements: StateTaxRequirement[] = [
  {
    state: "Alabama",
    entityTypes: {
      llc: { form: "Form 65", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form 20S", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form 20C", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form 1040, Schedule C (federal)", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Alaska",
    entityTypes: {
      llc: { form: "No state income tax; federal Form 1065", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "No state income tax; federal Form 1120-S", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form 6000 (Corporate Income Tax)", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "No state income tax; federal Form 1040, Schedule C", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Arizona",
    entityTypes: {
      llc: { form: "Form 165", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form 120S", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form 120", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form 1040, Schedule C (federal)", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Arkansas",
    entityTypes: {
      llc: { form: "Form AR1050", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form AR1100S", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form AR1100CT", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form AR1000F", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "California",
    entityTypes: {
      llc: { form: "Form 568", dueDate: "April 15", extension: "October 15" },
      sCorp: { form: "Form 100S", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form 100", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form 540", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Colorado",
    entityTypes: {
      llc: { form: "Form 106", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form 105", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form 112", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form 104", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Connecticut",
    entityTypes: {
      llc: { form: "Form CT-1065/CT-1120SI", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form CT-1065/CT-1120SI", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form CT-1120", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form CT-1040", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Delaware",
    entityTypes: {
      llc: { form: "No state income tax; federal Form 1065", dueDate: "March 15", notes: "Franchise Tax due June 1" },
      sCorp: { form: "No state income tax; federal Form 1120-S", dueDate: "March 15", notes: "Franchise Tax due June 1" },
      corporation: { form: "Form 1100", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "No state income tax; federal Form 1040, Schedule C", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Florida",
    entityTypes: {
      llc: { form: "No state income tax; federal Form 1065", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "No state income tax; federal Form 1120-S", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form F-1120", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "No state income tax; federal Form 1040, Schedule C", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Georgia",
    entityTypes: {
      llc: { form: "Form 700", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form 600S", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form 600", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form 500", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Hawaii",
    entityTypes: {
      llc: { form: "Form N-20", dueDate: "April 20", extension: "October 20" },
      sCorp: { form: "Form N-35", dueDate: "April 20", extension: "October 20" },
      corporation: { form: "Form N-30", dueDate: "April 20", extension: "October 20" },
      soleProprietor: { form: "Form N-11", dueDate: "April 20", extension: "October 20" }
    }
  },
  {
    state: "Idaho",
    entityTypes: {
      llc: { form: "Form 65", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form 41S", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form 41", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form 40", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Illinois",
    entityTypes: {
      llc: { form: "Form IL-1065", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form IL-1120-ST", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form IL-1120", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form IL-1040", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Indiana",
    entityTypes: {
      llc: { form: "Form IT-65", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form IT-20S", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form IT-20", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form IT-40", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Iowa",
    entityTypes: {
      llc: { form: "Form IA 1065", dueDate: "April 30", extension: "October 30" },
      sCorp: { form: "Form IA 1120S", dueDate: "April 30", extension: "October 30" },
      corporation: { form: "Form IA 1120", dueDate: "April 30", extension: "October 30" },
      soleProprietor: { form: "Form IA 1040", dueDate: "April 30", extension: "October 30" }
    }
  },
  {
    state: "Kansas",
    entityTypes: {
      llc: { form: "Form K-65", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form K-120S", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form K-120", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form K-40", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Kentucky",
    entityTypes: {
      llc: { form: "Form 725", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form 720S", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form 720", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form 740", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Louisiana",
    entityTypes: {
      llc: { form: "Form IT-565", dueDate: "May 15", extension: "November 15" },
      sCorp: { form: "Form CIFT-620", dueDate: "May 15", extension: "November 15" },
      corporation: { form: "Form CIFT-620", dueDate: "May 15", extension: "November 15" },
      soleProprietor: { form: "Form IT-540", dueDate: "May 15", extension: "November 15" }
    }
  },
  {
    state: "Maine",
    entityTypes: {
      llc: { form: "Form 1065ME", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form 1120S-ME", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form 1120ME", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form 1040ME", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Maryland",
    entityTypes: {
      llc: { form: "Form 510", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form 510", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form 500", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form 502", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Massachusetts",
    entityTypes: {
      llc: { form: "Form 3", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form 355S", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form 355", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form 1", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Michigan",
    entityTypes: {
      llc: { form: "Form 165", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form 4891", dueDate: "April 15", extension: "October 15" },
      corporation: { form: "Form 4891", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form MI-1040", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Minnesota",
    entityTypes: {
      llc: { form: "Form M3", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form M8", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form M4", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form M1", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Mississippi",
    entityTypes: {
      llc: { form: "Form 86-100", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form 84-105", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form 83-105", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form 80-105", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Missouri",
    entityTypes: {
      llc: { form: "Form MO-1065", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form MO-1120S", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form MO-1120", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form MO-1040", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Montana",
    entityTypes: {
      llc: { form: "Form PR-1", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form CIT", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form CIT", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form 2", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Nebraska",
    entityTypes: {
      llc: { form: "Form 1065N", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form 1120-SN", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form 1120N", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form 1040N", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Nevada",
    entityTypes: {
      llc: { form: "No state income tax; federal Form 1065", dueDate: "March 15", notes: "Business License due April 1" },
      sCorp: { form: "No state income tax; federal Form 1120-S", dueDate: "March 15", notes: "Business License due April 1" },
      corporation: { form: "No state income tax; federal Form 1120", dueDate: "April 15", notes: "Business License due April 1" },
      soleProprietor: { form: "No state income tax; federal Form 1040, Schedule C", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "New Hampshire",
    entityTypes: {
      llc: { form: "Form NH-1065", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form NH-1120", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form NH-1120", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form 1040, Schedule C (federal)", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "New Jersey",
    entityTypes: {
      llc: { form: "Form NJ-1065", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form CBT-100S", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form CBT-100", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form NJ-1040", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "New Mexico",
    entityTypes: {
      llc: { form: "Form PTE", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form S-Corp", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form CIT-1", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form PIT-1", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "New York",
    entityTypes: {
      llc: { form: "Form IT-204", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form CT-3-S", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form CT-3", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form IT-201", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "North Carolina",
    entityTypes: {
      llc: { form: "Form D-403", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form CD-401S", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form CD-405", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form D-400", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "North Dakota",
    entityTypes: {
      llc: { form: "Form 58", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form 60", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form 40", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form ND-1", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Ohio",
    entityTypes: {
      llc: { form: "Form IT 1140", dueDate: "April 15", extension: "October 15" },
      sCorp: { form: "Form IT 1140", dueDate: "April 15", extension: "October 15" },
      corporation: { form: "Form IT 1120", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form IT 1040", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Oklahoma",
    entityTypes: {
      llc: { form: "Form 514", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form 512-S", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form 512", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form 511", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Oregon",
    entityTypes: {
      llc: { form: "Form OR-65", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form OR-20-S", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form OR-20", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form OR-40", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Pennsylvania",
    entityTypes: {
      llc: { form: "Form PA-65", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form PA-20S/PA-65", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form RCT-101", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form PA-40", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Rhode Island",
    entityTypes: {
      llc: { form: "Form RI-1065", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form RI-1120S", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form RI-1120C", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form RI-1040", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "South Carolina",
    entityTypes: {
      llc: { form: "Form SC1065", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form SC1120S", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form SC1120", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form SC1040", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "South Dakota",
    entityTypes: {
      llc: { form: "No state income tax; federal Form 1065", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "No state income tax; federal Form 1120-S", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "No state income tax; federal Form 1120", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "No state income tax; federal Form 1040, Schedule C", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Tennessee",
    entityTypes: {
      llc: { form: "Form FAE170", dueDate: "April 15", extension: "October 15" },
      sCorp: { form: "Form FAE170", dueDate: "April 15", extension: "October 15" },
      corporation: { form: "Form FAE170", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "No state income tax; federal Form 1040, Schedule C", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Texas",
    entityTypes: {
      llc: { form: "Form 05-102 (Franchise Tax)", dueDate: "May 15" },
      sCorp: { form: "Form 05-102 (Franchise Tax)", dueDate: "May 15" },
      corporation: { form: "Form 05-102 (Franchise Tax)", dueDate: "May 15" },
      soleProprietor: { form: "No state income tax; federal Form 1040, Schedule C", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Utah",
    entityTypes: {
      llc: { form: "Form TC-65", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form TC-20S", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form TC-20", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form TC-40", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Vermont",
    entityTypes: {
      llc: { form: "Form BI-471", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form BI-471", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form CO-411", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form IN-111", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Virginia",
    entityTypes: {
      llc: { form: "Form 502", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form 502", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form 500", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form 760", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Washington",
    entityTypes: {
      llc: { form: "No state income tax; federal Form 1065", dueDate: "March 15", notes: "B&O tax varies" },
      sCorp: { form: "No state income tax; federal Form 1120-S", dueDate: "March 15", notes: "B&O tax varies" },
      corporation: { form: "No state income tax; federal Form 1120", dueDate: "April 15", notes: "B&O tax varies" },
      soleProprietor: { form: "No state income tax; federal Form 1040, Schedule C", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "West Virginia",
    entityTypes: {
      llc: { form: "Form WV/IT-141", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form WV/CIT-120", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form WV/CIT-120", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form IT-140", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Wisconsin",
    entityTypes: {
      llc: { form: "Form 3", dueDate: "March 15", extension: "September 15" },
      sCorp: { form: "Form 5S", dueDate: "March 15", extension: "September 15" },
      corporation: { form: "Form 4", dueDate: "April 15", extension: "October 15" },
      soleProprietor: { form: "Form 1", dueDate: "April 15", extension: "October 15" }
    }
  },
  {
    state: "Wyoming",
    entityTypes: {
      llc: { form: "No state income tax; federal Form 1065", dueDate: "March 15", notes: "Annual Report due on anniversary" },
      sCorp: { form: "No state income tax; federal Form 1120-S", dueDate: "March 15", notes: "Annual Report due on anniversary" },
      corporation: { form: "No state income tax; federal Form 1120", dueDate: "April 15", notes: "Annual Report due on anniversary" },
      soleProprietor: { form: "No state income tax; federal Form 1040, Schedule C", dueDate: "April 15", extension: "October 15" }
    }
  }
];

// Federal tax requirements for reference
export const federalTaxRequirements = {
  llc: { form: "Form 1065", dueDate: "March 15", extension: "September 15 with Form 7004" },
  sCorp: { form: "Form 1120-S", dueDate: "March 15", extension: "September 15 with Form 7004" },
  corporation: { form: "Form 1120", dueDate: "April 15", extension: "October 15 with Form 7004" },
  soleProprietor: { form: "Form 1040, Schedule C", dueDate: "April 15", extension: "October 15 with Form 4868" }
};

// Helper function to get tax requirements for a specific state and entity type
export function getStateTaxRequirements(state: string, entityType: 'llc' | 'sCorp' | 'corporation' | 'soleProprietor') {
  const stateData = stateTaxRequirements.find(s => s.state.toLowerCase() === state.toLowerCase());
  return stateData ? stateData.entityTypes[entityType] : null;
}

// Helper function to get all requirements for a state
export function getAllStateTaxRequirements(state: string) {
  return stateTaxRequirements.find(s => s.state.toLowerCase() === state.toLowerCase());
}

// Helper function to get federal tax requirements
export function getFederalTaxRequirements(entityType: 'llc' | 'sCorp' | 'corporation' | 'soleProprietor') {
  return federalTaxRequirements[entityType];
}

// Helper function to get states with specific characteristics
export function getStatesWithNoIncomeTax() {
  return stateTaxRequirements.filter(state => 
    state.entityTypes.llc.form.includes("No state income tax") ||
    state.entityTypes.corporation.form.includes("No state income tax")
  ).map(state => state.state);
}