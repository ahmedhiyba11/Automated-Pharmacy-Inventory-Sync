document.getElementById('fillBtn').addEventListener('click', async () => {
  const csvLink = document.getElementById('csvLink').value;
  const status = document.getElementById('status');

  if (!csvLink) {
    status.innerText = "برجاء إدخال رابط الشيت الصحيح";
    status.style.color = "red";
    return;
  }

  status.innerText = "جاري جلب البيانات...";
  status.style.color = "blue";

  try {
    // جلب البيانات من الشيت
    const response = await fetch(csvLink);
    const csvText = await response.text();

    // دالة ذكية لتقسيم السطر مع تجاهل الفواصل التي تقع داخل علامات التنصيص (مثل أسماء الأدوية)
    const parseCSVLine = (text) => {
      let p = '', r = [], q = false;
      for (let i = 0; i < text.length; i++) {
        let c = text[i];
        if (c === '"') { q = !q; } // تبديل حالة علامة التنصيص
        else if (c === ',' && !q) { r.push(p.trim()); p = ''; } // تقسيم فقط لو بره التنصيص
        else { p += c; }
      }
      r.push(p.trim());
      return r;
    };

    // تقسيم البيانات لصفوف وأعمدة بشكل صحيح وآمن
    const rows = csvText.split('\n').map(row => parseCSVLine(row));

    // تحديد الصفحة النشطة (السيرفاي)
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // تشغيل كود التعبئة داخل السيرفاي
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    }, () => {
      chrome.tabs.sendMessage(tab.id, { action: "fill_data", data: rows }, (res) => {
        status.innerText = "تم تعبئة السيرفاي بنجاح!";
        status.style.color = "green";
      });
    });

  } catch (error) {
     status.innerText = "حدث خطأ! تأكد من الرابط أو اتصال الإنترنت.";
     status.style.color = "red";
     console.error(error);
  }
});