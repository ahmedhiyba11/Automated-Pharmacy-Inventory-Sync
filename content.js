chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fill_data") {
    const rows = request.data;
    
    // الفهارس الصحيحة تماماً من واقع الشيت الحقيقي:
    const ITEM_NAME_IDX = 0; // العمود A (اسم الصنف)
    const STOCK_IDX = 1;     // العمود B (الرصيد)
    const NEED_NUM_IDX = 2;  // العمود C (الاحتياج الفعلي)

    // دالة تنظيف وتوحيد النصوص لإلغاء الفروق في المسافات، النجوم، الأقواس والشرطات
    function normalizeText(text) {
      if (!text) return "";
      return text.toString()
                 .toLowerCase()
                 .replace(/[*:\-\s_\/\\(),.\[\]]/g, '')
                 .trim();
    }

    // تخطي صف العناوين وتصفية الصفوف الفارغة
    const dataRows = rows.slice(1).filter(row => row.length > NEED_NUM_IDX && row[ITEM_NAME_IDX]);
    let filledCount = 0;

    // جلب كل خانات الإدخال المتاحة في الصفحة (بدون تقييد بنوع text الصريح لتفادي فخ التصميم)
    const allInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])'));

    for (let i = 0; i < dataRows.length; i++) {
      let sheetItemName = dataRows[i][ITEM_NAME_IDX].trim();
      let balanceVal = dataRows[i][STOCK_IDX] ? dataRows[i][STOCK_IDX].trim() : "0";
      let needVal = dataRows[i][NEED_NUM_IDX] ? dataRows[i][NEED_NUM_IDX].trim() : "0";

      if (!sheetItemName) continue;

      let normalizedSheetName = normalizeText(sheetItemName);
      let matchedLabelElement = null;
      
      const textElements = document.querySelectorAll('p, span, label, strong, h1, h2, h3, h4');

      // 1. محاولة المطابقة التامة بعد التنظيف
      for (const el of textElements) {
        if (normalizeText(el.textContent) === normalizedSheetName) {
          matchedLabelElement = el;
          break;
        }
      }

      // 2. محاولة المطابقة الجزئية الذكية (لو الاسم مقتطع في الشيت)
      if (!matchedLabelElement) {
        for (const el of textElements) {
          let normalizedElText = normalizeText(el.textContent);
          if (normalizedSheetName.length > 5 && normalizedElText.length > 5) {
            if (normalizedElText.includes(normalizedSheetName) || normalizedSheetName.includes(normalizedElText)) {
              // أمان: نضمن ألا يطابق بالخطأ نصوص عامة مثل اسم المستشفى
              if (!normalizedElText.includes("المستشفى") && !normalizedElText.includes("hospital")) {
                matchedLabelElement = el;
                break;
              }
            }
          }
        }
      }

      // إذا عثرنا على عنوان الدواء في الصفحة
      if (matchedLabelElement) {
        // فلترة كل خانات الصفحة لنأخذ فقط الخانات التي تقع "بعد" عنوان الدواء برمجياً وزمنياً
        let relevantInputs = allInputs.filter(input => {
          return (matchedLabelElement.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING);
        });

        // أول خانة بعد الاسم هي الرصيد، والثانية هي الاحتياج
        if (relevantInputs.length >= 2) {
          const inputBalance = relevantInputs[0];
          const inputNeed = relevantInputs[1];

          // إدخال القيم
          inputBalance.value = balanceVal;
          inputBalance.dispatchEvent(new Event('input', { bubbles: true }));
          inputBalance.dispatchEvent(new Event('change', { bubbles: true }));

          inputNeed.value = needVal;
          inputNeed.dispatchEvent(new Event('input', { bubbles: true }));
          inputNeed.dispatchEvent(new Event('change', { bubbles: true }));

          filledCount++;
          console.log(`✅ تم ملء: ${sheetItemName} -> رصيد: ${balanceVal}، احتياج: ${needVal}`);
        }
      }
    }

    sendResponse({ status: "done", count: filledCount });
  }
  return true; 
});