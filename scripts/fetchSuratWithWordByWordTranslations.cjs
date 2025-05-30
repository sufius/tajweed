const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Base URL and output directory
const baseUrl = "https://api.quran.com/api/v4/verses/by_chapter";
const outputDir = path.join(__dirname,"..", "public", "surat");
const languages = "27,19,45,79"; // german, english, ru, ru

// Create the output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

(async () => {
    for (let surahNumber = 1; surahNumber <= 114; surahNumber++) {
        try {
            // Fetch the data for the current Surah
            const url = `${baseUrl}/${surahNumber}?words=true&word_fields=text_uthmani&translations=${languages}&fields=text_uthmani`;
            const response = await axios.get(url);

            // Save the data to a file
            const filePath = path.join(outputDir, `wbw-surah-${surahNumber}.json`);
            fs.writeFileSync(filePath, JSON.stringify(response.data, null, 2));

            console.log(`Saved: ${filePath}`);
        } catch (error) {
            console.error(`Failed to fetch or save Surah ${surahNumber}:`, error.message);
        }
    }
})();


// {
//     "translations": [
//       {
//         "id": 85,
//         "name": "M.A.S. Abdel Haleem",
//         "author_name": "Abdul Haleem",
//         "slug": "en-haleem",
//         "language_name": "english",
//         "translated_name": {
//           "name": "M.A.S. Abdel Haleem",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 131,
//         "name": "Dr. Mustafa Khattab, The Clear Quran",
//         "author_name": "Dr. Mustafa Khattab",
//         "slug": "clearquran-with-tafsir",
//         "language_name": "english",
//         "translated_name": {
//           "name": "Dr. Mustafa Khattab",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 84,
//         "name": "T. Usmani",
//         "author_name": "Mufti Taqi Usmani",
//         "slug": "en-taqi-usmani",
//         "language_name": "english",
//         "translated_name": {
//           "name": "T. Usmani",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 95,
//         "name": "A. Maududi (Tafhim commentary)",
//         "author_name": "Sayyid Abul Ala Maududi",
//         "slug": "en-al-maududi",
//         "language_name": "english",
//         "translated_name": {
//           "name": "A. Maududi (Tafhim commentary)",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 79,
//         "name": "Abu Adel",
//         "author_name": "Abu Adel",
//         "slug": "ru-abu-adel",
//         "language_name": "russian",
//         "translated_name": {
//           "name": "Abu Adel",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 86,
//         "name": "Office of the president of Maldives",
//         "author_name": "Office of the president of Maldives",
//         "slug": "dv-unknow",
//         "language_name": "divehi, dhivehi, maldivian",
//         "translated_name": {
//           "name": "Divehi",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 19,
//         "name": "M. Pickthall",
//         "author_name": "Mohammed Marmaduke William Pickthall",
//         "slug": "quran.en.pickthall",
//         "language_name": "english",
//         "translated_name": {
//           "name": "M. Pickthall",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 75,
//         "name": "Alikhan Musayev",
//         "author_name": "Alikhan Musayev",
//         "slug": "az-alikhan",
//         "language_name": "azeri",
//         "translated_name": {
//           "name": "Alikhan Musayev",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 76,
//         "name": "Muhammad Saleh",
//         "author_name": "Muhammad Saleh",
//         "slug": "ug-saleh",
//         "language_name": "uighur, uyghur",
//         "translated_name": {
//           "name": "Muhammad Saleh",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 83,
//         "name": "Sheikh Isa Garcia",
//         "author_name": "Sheikh Isa Garcia",
//         "slug": "es-isa-garcia",
//         "language_name": "spanish",
//         "translated_name": {
//           "name": "Sheikh Isa Garcia",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 78,
//         "name": "Ministry of Awqaf, Egypt",
//         "author_name": "Ministry of Awqaf, Egypt",
//         "slug": "ru-ministry-of-awqaf",
//         "language_name": "russian",
//         "translated_name": {
//           "name": "Ministry of Awqaf, Egypt",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 81,
//         "name": "Burhan Muhammad-Amin",
//         "author_name": "Burhan Muhammad-Amin",
//         "slug": "ku-burhan-muhammad",
//         "language_name": "kurdish",
//         "translated_name": {
//           "name": "Burhan Muhammad-Amin",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 80,
//         "name": "Muhammad Karakunnu and Vanidas Elayavoor",
//         "author_name": "Muhammad Karakunnu and Vanidas Elayavoor",
//         "slug": "ml-karakunnu",
//         "language_name": "malayalam",
//         "translated_name": {
//           "name": "Muhammad Karakunnu and Vanidas Elayavoor",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 22,
//         "name": "A. Yusuf Ali",
//         "author_name": "Abdullah Yusuf Ali",
//         "slug": "quran.en.yusufali",
//         "language_name": "english",
//         "translated_name": {
//           "name": "A. Yusuf Ali",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 20,
//         "name": "Saheeh International",
//         "author_name": "Saheeh International",
//         "slug": "en-sahih-international",
//         "language_name": "english",
//         "translated_name": {
//           "name": "Saheeh International",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 203,
//         "name": "Al-Hilali & Khan",
//         "author_name": "Muhammad Taqi-ud-Din al-Hilali & Muhammad Muhsin Khan",
//         "slug": "",
//         "language_name": "english",
//         "translated_name": {
//           "name": "Al-Hilali & Khan",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 234,
//         "name": "Fatah Muhammad Jalandhari",
//         "author_name": "Fatah Muhammad Jalandhari",
//         "slug": "ur-fatah-muhammad-jalandhari",
//         "language_name": "urdu",
//         "translated_name": {
//           "name": "Fatah Muhammad Jalandhari",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 57,
//         "name": "Transliteration",
//         "author_name": "Transliteration",
//         "slug": "transliteration",
//         "language_name": "english",
//         "translated_name": {
//           "name": "Transliteration",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 54,
//         "name": "Maulana Muhammad Junagarhi",
//         "author_name": "Maulana Muhammad Junagarhi",
//         "slug": "ur-junagarri",
//         "language_name": "urdu",
//         "translated_name": {
//           "name": "Maulana Muhammad Junagarhi",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 156,
//         "name": "Fe Zilal al-Qur'an",
//         "author_name": "Sayyid Ibrahim Qutb",
//         "slug": "urdu-sayyid-qatab",
//         "language_name": "urdu",
//         "translated_name": {
//           "name": "Fi Zilal al-Qur'an",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 151,
//         "name": "Shaykh al-Hind Mahmud al-Hasan(with Tafsir E Usmani)",
//         "author_name": "Shaykh al-Hind Mahmud al-Hasan",
//         "slug": "tafsir-e-usmani",
//         "language_name": "urdu",
//         "translated_name": {
//           "name": "Shaykh al-Hind Mahmud al-Hasan(with Tafsir E Usmani)",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 158,
//         "name": "Bayan-ul-Quran",
//         "author_name": "Dr. Israr Ahmad",
//         "slug": "bayan-ul-quran",
//         "language_name": "urdu",
//         "translated_name": {
//           "name": "Bayan-ul-Quran (Dr. Israr Ahmad)",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 97,
//         "name": "Tafheem e Qur'an - Syed Abu Ali Maududi",
//         "author_name": "Syed Abu Ali Maududi",
//         "slug": "ur-al-maududi",
//         "language_name": "urdu",
//         "translated_name": {
//           "name": "Tafheem e Qur'an - Syed Abu Ali Maududi",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 136,
//         "name": "Montada Islamic Foundation",
//         "author_name": "Montada Islamic Foundation",
//         "slug": null,
//         "language_name": "french",
//         "translated_name": {
//           "name": "Montada Islamic Foundation",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 135,
//         "name": "IslamHouse.com",
//         "author_name": "IslamHouse.com",
//         "slug": null,
//         "language_name": "persian",
//         "translated_name": {
//           "name": "IslamHouse.com",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 139,
//         "name": "Khawaja Mirof & Khawaja Mir",
//         "author_name": "Khawaja Mirof & Khawaja Mir",
//         "slug": null,
//         "language_name": "tajik",
//         "translated_name": {
//           "name": "Khawaja Mirof & Khawaja Mir",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 35,
//         "name": "Ryoichi Mita",
//         "author_name": "Ryoichi Mita",
//         "slug": "ja-ryoichi-mita",
//         "language_name": "japanese",
//         "translated_name": {
//           "name": "Ryoichi Mita",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 134,
//         "name": "King Fahad Quran Complex",
//         "author_name": "King Fahad Quran Complex",
//         "slug": null,
//         "language_name": "indonesian",
//         "translated_name": {
//           "name": "King Fahad Quran Complex",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 153,
//         "name": "Hamza Roberto Piccardo",
//         "author_name": "Hamza Roberto Piccardo",
//         "slug": "hamza-roberto-piccardo",
//         "language_name": "italian",
//         "translated_name": {
//           "name": "Hamza Roberto Piccardo",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 161,
//         "name": "Taisirul Quran",
//         "author_name": "Tawheed Publication",
//         "slug": "bn-taisirul-quran",
//         "language_name": "bengali",
//         "translated_name": {
//           "name": "Taisirul Quran",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 163,
//         "name": "Sheikh Mujibur Rahman",
//         "author_name": "Darussalaam Publication",
//         "slug": "bn-sheikh-mujibur-rahman",
//         "language_name": "bengali",
//         "translated_name": {
//           "name": "Sheikh Mujibur Rahman",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 162,
//         "name": "Rawai Al-bayan",
//         "author_name": "Bayaan Foundation",
//         "slug": "bn-rawai-al-bayan",
//         "language_name": "bengali",
//         "translated_name": {
//           "name": "Rawai Al-bayan",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 210,
//         "name": "Dar Al-Salam Center",
//         "author_name": "Dar Al-Salam Center",
//         "slug": null,
//         "language_name": "turkish",
//         "translated_name": {
//           "name": "Dar Al-Salam Center",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 211,
//         "name": "Dar Al-Salam Center",
//         "author_name": "Dar Al-Salam Center",
//         "slug": null,
//         "language_name": "tagalog",
//         "translated_name": {
//           "name": "Dar Al-Salam Center",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 217,
//         "name": "Dr. Mikhailo Yaqubovic",
//         "author_name": "Dr. Mikhailo Yaqubovic",
//         "slug": null,
//         "language_name": "ukrainian",
//         "translated_name": {
//           "name": "Dr. Mikhailo Yaqubovic",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 229,
//         "name": "Sheikh Omar Sharif bin Abdul Salam",
//         "author_name": "Sheikh Omar Sharif bin Abdul Salam",
//         "slug": null,
//         "language_name": "tamil",
//         "translated_name": {
//           "name": "Sheikh Omar Sharif bin Abdul Salam",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 55,
//         "name": "Muhammad Sodiq Muhammad Yusuf (Latin) ",
//         "author_name": "Muhammad Sodiq Muhammad Yusuf",
//         "slug": "quran.uz.sodik",
//         "language_name": "uzbek",
//         "translated_name": {
//           "name": "Muhammad Sodiq Muhammad Yusuf (Latin)",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 143,
//         "name": "Muhammad Saleh Bamoki",
//         "author_name": "Muhammad Saleh Bamoki",
//         "slug": null,
//         "language_name": "kurdish",
//         "translated_name": {
//           "name": "Muhammad Saleh Bamoki",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 141,
//         "name": "The Sabiq company",
//         "author_name": "The Sabiq company",
//         "slug": "",
//         "language_name": "indonesian",
//         "translated_name": {
//           "name": "The Sabiq company",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 140,
//         "name": "Montada Islamic Foundation",
//         "author_name": "Montada Islamic Foundation",
//         "slug": null,
//         "language_name": "spanish",
//         "translated_name": {
//           "name": "Montada Islamic Foundation",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 214,
//         "name": "Dar Al-Salam Center",
//         "author_name": "Dar Al-Salam Center",
//         "slug": null,
//         "language_name": "bosnian",
//         "translated_name": {
//           "name": "Dar Al-Salam Center",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 227,
//         "name": "Maulana Abder-Rahim ibn Muhammad",
//         "author_name": "Maulana Abder-Rahim ibn Muhammad",
//         "slug": null,
//         "language_name": "telugu",
//         "translated_name": {
//           "name": "Maulana Abder-Rahim ibn Muhammad",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 226,
//         "name": "Muhammad Shafi’i Ansari",
//         "author_name": "Muhammad Shafi’i Ansari",
//         "slug": null,
//         "language_name": "marathi",
//         "translated_name": {
//           "name": "Muhammad Shafi’i Ansari",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 233,
//         "name": "Dar Al-Salam Center",
//         "author_name": "Dar Al-Salam Center",
//         "slug": null,
//         "language_name": "hebrew",
//         "translated_name": {
//           "name": "Dar Al-Salam Center",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 225,
//         "name": "Rabila Al-Umry",
//         "author_name": "Rabila Al-Umry",
//         "slug": null,
//         "language_name": "gujarati",
//         "translated_name": {
//           "name": "Rabila Al-Umry",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 224,
//         "name": "Abdul-Hamid Haidar & Kanhi Muhammad",
//         "author_name": "Abdul-Hamid Haidar & Kanhi Muhammad",
//         "slug": null,
//         "language_name": "malayalam",
//         "translated_name": {
//           "name": "Abdul-Hamid Haidar & Kanhi Muhammad",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 235,
//         "name": "Malak Faris Abdalsalaam",
//         "author_name": "Malak Faris Abdalsalaam",
//         "slug": "nl-abdalsalaam",
//         "language_name": "dutch",
//         "translated_name": {
//           "name": "Malak Faris Abdalsalaam",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 232,
//         "name": "African Development Foundation",
//         "author_name": "African Development Foundation",
//         "slug": null,
//         "language_name": "ganda",
//         "translated_name": {
//           "name": "African Development Foundation",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 231,
//         "name": "Dr. Abdullah Muhammad Abu Bakr and Sheikh Nasir Khamis",
//         "author_name": "Dr. Abdullah Muhammad Abu Bakr and Sheikh Nasir Khamis",
//         "slug": null,
//         "language_name": "swahili",
//         "translated_name": {
//           "name": "Dr. Abdullah Muhammad Abu Bakr and Sheikh Nasir Khamis",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 230,
//         "name": "Society of Institutes and Universities",
//         "author_name": "Society of Institutes and Universities",
//         "slug": "",
//         "language_name": "thai",
//         "translated_name": {
//           "name": "Society of Institutes and Universities",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 223,
//         "name": "Pioneers of Translation Center",
//         "author_name": "Pioneers of Translation Center",
//         "slug": null,
//         "language_name": "tajik",
//         "translated_name": {
//           "name": "Pioneers of Translation Center",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 222,
//         "name": "Khalifa Altay",
//         "author_name": "Khalifa Altay",
//         "slug": null,
//         "language_name": "kazakh",
//         "translated_name": {
//           "name": "Khalifa Altay",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 220,
//         "name": "Ruwwad Center",
//         "author_name": "Translation Pioneers Center",
//         "slug": null,
//         "language_name": "vietnamese",
//         "translated_name": {
//           "name": "Translation Pioneers Center",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 144,
//         "name": "Sofian S. Siregar",
//         "author_name": "Sofian S. Siregar",
//         "slug": "nl_sofian_s._siregar",
//         "language_name": "Dutch",
//         "translated_name": {
//           "name": "Sofian S. Siregar",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 88,
//         "name": "Hasan Efendi Nahi",
//         "author_name": "Hasan Efendi Nahi",
//         "slug": "al-hasan-efendi",
//         "language_name": "albanian",
//         "translated_name": {
//           "name": "Hasan Efendi Nahi",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 87,
//         "name": "Sadiq and Sani",
//         "author_name": "Sadiq and Sani",
//         "slug": "am-sadiq",
//         "language_name": "amharic",
//         "translated_name": {
//           "name": "Sadiq and Sani",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 50,
//         "name": "Jan Trust Foundation",
//         "author_name": "Jan Trust Foundation",
//         "slug": "ta-jan-trust",
//         "language_name": "tamil",
//         "translated_name": {
//           "name": "Jan Trust Foundation",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 49,
//         "name": "Ali Muhsin Al-Barwani",
//         "author_name": "Ali Muhsin Al-Barwani",
//         "slug": "sw-ali-muhsin",
//         "language_name": "swahili",
//         "translated_name": {
//           "name": "Ali Muhsin Al-Barwani",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 48,
//         "name": "Knut Bernström",
//         "author_name": "Knut Bernström",
//         "slug": "sv-knut",
//         "language_name": "swedish",
//         "translated_name": {
//           "name": "Knut Bernström",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 128,
//         "name": "Cambodian Muslim Community Development",
//         "author_name": "Cambodian Muslim Community Development",
//         "slug": null,
//         "language_name": "central khmer",
//         "translated_name": {
//           "name": "Cambodian Muslim Community Development",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 45,
//         "name": "Russian Translation ( Elmir Kuliev )",
//         "author_name": "Elmir Kuliev",
//         "slug": "quran.ru.kuliev",
//         "language_name": "russian",
//         "translated_name": {
//           "name": "Russian Translation ( Elmir Kuliev )",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 77,
//         "name": "Turkish Translation(Diyanet)",
//         "author_name": "Diyanet Isleri",
//         "slug": "quran.tr.diyanet",
//         "language_name": "turkish",
//         "translated_name": {
//           "name": "Turkish Translation(Diyanet)",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 39,
//         "name": "Abdullah Muhammad Basmeih",
//         "author_name": "Abdullah Muhammad Basmeih",
//         "slug": "ms-abdullah",
//         "language_name": "malay",
//         "translated_name": {
//           "name": "Abdullah Muhammad Basmeih",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 36,
//         "name": "Korean",
//         "author_name": "Korean",
//         "slug": "ko-unknown",
//         "language_name": "korean",
//         "translated_name": {
//           "name": "Korean",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 30,
//         "name": "Finnish",
//         "author_name": "Finnish",
//         "slug": "fi-unknown",
//         "language_name": "finnish",
//         "translated_name": {
//           "name": "Finnish",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 26,
//         "name": "Czech",
//         "author_name": "Czech",
//         "slug": "cs-unknown",
//         "language_name": "czech",
//         "translated_name": {
//           "name": "Czech",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 103,
//         "name": "Helmi Nasr",
//         "author_name": "Helmi Nasr",
//         "slug": null,
//         "language_name": "portuguese",
//         "translated_name": {
//           "name": "Helmi Nasr",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 74,
//         "name": "Tajik",
//         "author_name": "AbdolMohammad Ayati",
//         "slug": "tg-ayati",
//         "language_name": "tajik",
//         "translated_name": {
//           "name": "Tajik",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 23,
//         "name": "Azerbaijani",
//         "author_name": "Azerbaijani",
//         "slug": "az-unknown",
//         "language_name": "azeri",
//         "translated_name": {
//           "name": "Azerbaijani",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 101,
//         "name": "Alauddin Mansour",
//         "author_name": "Alauddin Mansour",
//         "slug": null,
//         "language_name": "uzbek",
//         "translated_name": {
//           "name": "Alauddin Mansour",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 53,
//         "name": "Tatar",
//         "author_name": "Tatar",
//         "slug": "tt-unknow",
//         "language_name": "tatar",
//         "translated_name": {
//           "name": "Tatar",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 47,
//         "name": "Albanian",
//         "author_name": "Albanian",
//         "slug": "sq-unknown",
//         "language_name": "albanian",
//         "translated_name": {
//           "name": "Albanian",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 44,
//         "name": "Grigore",
//         "author_name": "George Grigore",
//         "slug": "ro-grigore",
//         "language_name": "Romanian",
//         "translated_name": {
//           "name": "Grigore",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 42,
//         "name": "Józef Bielawski",
//         "author_name": "Józef Bielawski",
//         "slug": "pl-jozef-bielawski",
//         "language_name": "polish",
//         "translated_name": {
//           "name": "Józef Bielawski",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 41,
//         "name": "Norwegian",
//         "author_name": "Norwegian",
//         "slug": "no-unknown",
//         "language_name": "norwegian",
//         "translated_name": {
//           "name": "Norwegian",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 106,
//         "name": "Magomed Magomedov",
//         "author_name": "Magomed Magomedov",
//         "slug": "chechen-translation",
//         "language_name": "chechen",
//         "translated_name": {
//           "name": "Magomed Magomedov",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 236,
//         "name": "Ramdane At Mansour",
//         "author_name": "Ramdane At Mansour",
//         "slug": null,
//         "language_name": "Amazigh",
//         "translated_name": {
//           "name": "Ramdane At Mansour",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 237,
//         "name": "Tzvetan Theophanov",
//         "author_name": "Tzvetan Theophanov",
//         "slug": null,
//         "language_name": "Bulgarian",
//         "translated_name": {
//           "name": "Tzvetan Theophanov",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 238,
//         "name": "Taj Mehmood Amroti",
//         "author_name": "Taj Mehmood Amroti",
//         "slug": null,
//         "language_name": "Sindhi",
//         "translated_name": {
//           "name": "Taj Mehmood Amroti",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 125,
//         "name": "Shaykh Abu Rahimah Mikael Aykyuni",
//         "author_name": "Shaykh Abu Rahimah Mikael Aykyuni",
//         "slug": null,
//         "language_name": "yoruba",
//         "translated_name": {
//           "name": "Shaykh Abu Rahimah Mikael Aykyuni",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 124,
//         "name": "Muslim Shahin",
//         "author_name": "Muslim Shahin",
//         "slug": null,
//         "language_name": "turkish",
//         "translated_name": {
//           "name": "Muslim Shahin",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 46,
//         "name": "Mahmud Muhammad Abduh",
//         "author_name": "Mahmud Muhammad Abduh",
//         "slug": "so-mahmud-abduh",
//         "language_name": "somali",
//         "translated_name": {
//           "name": "Mahmud Muhammad Abduh",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 113,
//         "name": "Khalifah Altai",
//         "author_name": "Khalifah Altai",
//         "slug": null,
//         "language_name": "kazakh",
//         "translated_name": {
//           "name": "Khalifah Altai",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 112,
//         "name": "Shaban Britch",
//         "author_name": "Shaban Britch",
//         "slug": null,
//         "language_name": "turkish",
//         "translated_name": {
//           "name": "Shaban Britch",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 38,
//         "name": "Maranao",
//         "author_name": "Maranao",
//         "slug": "mrn-unknown",
//         "language_name": "maranao",
//         "translated_name": {
//           "name": "Maranao",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 89,
//         "name": "Albanian Translation",
//         "author_name": "Sherif Ahmeti\t",
//         "slug": "quran.al.ahmeti",
//         "language_name": "albanian",
//         "translated_name": {
//           "name": "Albanian Translation",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 56,
//         "name": "Chinese Translation (Simplified) - Ma Jain",
//         "author_name": "Ma Jian",
//         "slug": "quran.zh.ma.jain",
//         "language_name": "chinese",
//         "translated_name": {
//           "name": "Chinese Translation (Simplified) - Ma Jain",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 32,
//         "name": "Hausa Translation(Abubakar Gumi)",
//         "author_name": "Abubakar Mahmoud Gumi",
//         "slug": "quran.ha.abubakar",
//         "language_name": "hausa",
//         "translated_name": {
//           "name": "Hausa Translation(Abubakar Gumi)",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 108,
//         "name": "Ahl Al-Hadith Central Society of Nepal",
//         "author_name": "Ahl Al-Hadith Central Society of Nepal",
//         "slug": null,
//         "language_name": "nepali",
//         "translated_name": {
//           "name": "Ahl Al-Hadith Central Society of Nepal",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 37,
//         "name": "Malayalam Translation(Abdul Hameed and Kunhi)",
//         "author_name": "Cheriyamundam Abdul Hameed and Kunhi Mohammed Parappoor",
//         "slug": "quran.ml.abdul.hameed",
//         "language_name": "malayalam",
//         "translated_name": {
//           "name": "Malayalam Translation(Abdul Hameed and Kunhi)",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 43,
//         "name": "Portuguese Translation( Samir )",
//         "author_name": "Samir El-Hayek",
//         "slug": "quran,pt.samir",
//         "language_name": "portuguese",
//         "translated_name": {
//           "name": "Portuguese Translation( Samir )",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 51,
//         "name": "Thai Translatio (King Fahad Quran Complex)",
//         "author_name": "King Fahad Quran Complex",
//         "slug": "quran.th.quran.complex",
//         "language_name": "thai",
//         "translated_name": {
//           "name": "Thai Translatio (King Fahad Quran Complex)",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 111,
//         "name": "Ghali Apapur Apaghuna",
//         "author_name": "Ghali Apapur Apaghuna",
//         "slug": null,
//         "language_name": "oromo",
//         "translated_name": {
//           "name": "Ghali Apapur Apaghuna",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 115,
//         "name": "Abubakar Mahmood Jummi",
//         "author_name": "Abubakar Mahmood Jummi",
//         "slug": null,
//         "language_name": "hausa",
//         "translated_name": {
//           "name": "Abubakar Mahmood Jummi",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 31,
//         "name": "Muhammad Hamidullah",
//         "author_name": "Muhammad Hamidullah",
//         "slug": "quran.fr.hamidullah",
//         "language_name": "french",
//         "translated_name": {
//           "name": "Muhammad Hamidullah",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 29,
//         "name": "Hussein Taji Kal Dari",
//         "author_name": "Hussein Taji Kal Dari",
//         "slug": "fr-hussein-taji",
//         "language_name": "persian",
//         "translated_name": {
//           "name": "Hussein Taji Kal Dari",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 208,
//         "name": "Abu Reda Muhammad ibn Ahmad",
//         "author_name": "Abu Reda Muhammad ibn Ahmad",
//         "slug": null,
//         "language_name": "german",
//         "translated_name": {
//           "name": "Abu Reda Muhammad ibn Ahmad",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 209,
//         "name": "Othman al-Sharif",
//         "author_name": "Othman al-Sharif",
//         "slug": null,
//         "language_name": "italian",
//         "translated_name": {
//           "name": "Othman al-Sharif",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 133,
//         "name": "Abdul Hameed Baqavi",
//         "author_name": "Abdul Hameed Baqavi",
//         "slug": null,
//         "language_name": "tamil",
//         "translated_name": {
//           "name": "Abdul Hameed Baqavi",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 25,
//         "name": "Muhamed Mehanović",
//         "author_name": "Muhamed Mehanović",
//         "slug": "bs-unknown",
//         "language_name": "bosnian",
//         "translated_name": {
//           "name": "Muhamed Mehanović",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 221,
//         "name": "Hasan Abdul-Karim",
//         "author_name": "Hasan Abdul-Karim",
//         "slug": null,
//         "language_name": "vietnamese",
//         "translated_name": {
//           "name": "Hasan Abdul-Karim",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 219,
//         "name": "Hamed Choi",
//         "author_name": "Hamed Choi",
//         "slug": null,
//         "language_name": "korean",
//         "translated_name": {
//           "name": "Hamed Choi",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 52,
//         "name": "Elmalili Hamdi Yazir",
//         "author_name": "Elmalili Hamdi Yazir\t",
//         "slug": "tr-hamdi",
//         "language_name": "turkish",
//         "translated_name": {
//           "name": "Elmalili Hamdi Yazir",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 213,
//         "name": "Dr. Abu Bakr Muhammad Zakaria",
//         "author_name": "Dr. Abu Bakr Muhammad Zakaria",
//         "slug": null,
//         "language_name": "bengali",
//         "translated_name": {
//           "name": "Dr. Abu Bakr Muhammad Zakaria",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 199,
//         "name": "Noor International Center",
//         "author_name": "Noor International Center",
//         "slug": null,
//         "language_name": "spanish",
//         "translated_name": {
//           "name": "Noor International Center",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 218,
//         "name": "Saeed Sato",
//         "author_name": "Saeed Sato",
//         "slug": null,
//         "language_name": "japanese",
//         "translated_name": {
//           "name": "Saeed Sato",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 228,
//         "name": "Ruwwad Center",
//         "author_name": "Translation Pioneers Center",
//         "slug": null,
//         "language_name": "sinhala, sinhalese",
//         "translated_name": {
//           "name": "Translation Pioneers Center",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 126,
//         "name": "Besim Korkut",
//         "author_name": "Besim Korkut",
//         "slug": null,
//         "language_name": "bosnian",
//         "translated_name": {
//           "name": "Besim Korkut",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 122,
//         "name": "Maulana Azizul Haque al-Umari",
//         "author_name": "Maulana Azizul Haque al-Umari",
//         "slug": null,
//         "language_name": "hindi",
//         "translated_name": {
//           "name": "Maulana Azizul Haque al-Umari",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 120,
//         "name": "Shaykh Rafeequl Islam Habibur-Rahman",
//         "author_name": "Shaykh Rafeequl Islam Habibur-Rahman",
//         "slug": null,
//         "language_name": "assamese",
//         "translated_name": {
//           "name": "Shaykh Rafeequl Islam Habibur-Rahman",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 127,
//         "name": "Muhammad Sodik Muhammad Yusuf",
//         "author_name": "Muhammad Sodik Muhammad Yusuf",
//         "slug": "",
//         "language_name": "uzbek",
//         "translated_name": {
//           "name": "Muhammad Sodik Muhammad Yusuf",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 118,
//         "name": "Zakaria Abulsalam",
//         "author_name": "Zakaria Abulsalam",
//         "slug": null,
//         "language_name": "pashto",
//         "translated_name": {
//           "name": "Zakaria Abulsalam",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 109,
//         "name": "Muhammad Makin",
//         "author_name": "Muhammad Makin",
//         "slug": null,
//         "language_name": "chinese",
//         "translated_name": {
//           "name": "Muhammad Makin",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 27,
//         "name": "Frank Bubenheim and Nadeem",
//         "author_name": "Frank Bubenheim and Nadeem",
//         "slug": "de-bubenheim",
//         "language_name": "german",
//         "translated_name": {
//           "name": "Frank Bubenheim and Nadeem",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 33,
//         "name": "Indonesian Islamic affairs ministry",
//         "author_name": "Indonesian Islamic affairs ministry",
//         "slug": "quran.id",
//         "language_name": "indonesian",
//         "translated_name": {
//           "name": "Indonesian Islamic affairs ministry",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 785,
//         "name": "Mawlawi Muhammad Anwar Badkhashani",
//         "author_name": "Mawlawi Muhammad Anwar Badkhashani",
//         "slug": null,
//         "language_name": "dari",
//         "translated_name": {
//           "name": "Mawlawi Muhammad Anwar Badkhashani",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 795,
//         "name": "Suliman Kanti",
//         "author_name": "Suliman Kanti",
//         "slug": "",
//         "language_name": "bambara",
//         "translated_name": {
//           "name": "Suliman Kanti",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 779,
//         "name": "Rashid Maash",
//         "author_name": "Rashid Maash",
//         "slug": "fr-rashid-maash",
//         "language_name": "french",
//         "translated_name": {
//           "name": "Rashid Maash",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 771,
//         "name": "Kannada Translation",
//         "author_name": "Kannada Translation",
//         "slug": "kannada-quran",
//         "language_name": "kannada",
//         "translated_name": {
//           "name": "Kannada Translation",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 782,
//         "name": "Islamic and Cultural League",
//         "author_name": "Islamic and Cultural League",
//         "slug": "",
//         "language_name": "romanian",
//         "translated_name": {
//           "name": "Islamic and Cultural League",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 796,
//         "name": "Baba Mamady Jani",
//         "author_name": "Baba Mamady Jani",
//         "slug": null,
//         "language_name": "bambara",
//         "translated_name": {
//           "name": "Baba Mamady Jani",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 798,
//         "name": "Abdul Hamid Silika",
//         "author_name": "Abdul Hamid Silika",
//         "slug": null,
//         "language_name": "yau,yuw",
//         "translated_name": {
//           "name": "Abdul Hamid Silika",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 774,
//         "name": "The Rwanda Muslims Association team",
//         "author_name": "The Rwanda Muslims Association team",
//         "slug": null,
//         "language_name": "kinyarwanda",
//         "translated_name": {
//           "name": "The Rwanda Muslims Association team",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 840,
//         "name": "Abu Bakr Ibrahim Ali (Bakurube)",
//         "author_name": "Abu Bakr Ibrahim Ali",
//         "slug": "ml-shaikh-aboobakr-ibrahim-ali",
//         "language_name": "divehi",
//         "translated_name": {
//           "name": "Abu Bakr Ibrahim Ali (Bakurube)",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 819,
//         "name": "Maulana Wahiduddin Khan",
//         "author_name": "Maulana Wahiduddin Khan",
//         "slug": "maulana-wahid-uddin-khan-urdu",
//         "language_name": "urdu",
//         "translated_name": {
//           "name": "Maulana Wahiduddin Khan",
//           "language_name": "english"
//         }
//       },
//       {
//         "id": 831,
//         "name": "Abul Ala Maududi(Roman Urdu)",
//         "author_name": "Abul Ala Maududi",
//         "slug": "maududi-roman-urdu",
//         "language_name": "urdu",
//         "translated_name": {
//           "name": "Abul Ala Maududi(Roman Urdu)",
//           "language_name": "english"
//         }
//       }
//     ]
//   }