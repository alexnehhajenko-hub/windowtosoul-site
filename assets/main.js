let CURRENT_STYLE = "oil";

function selectStyle(s) {
  CURRENT_STYLE = s;
  document.querySelectorAll(".style-btns button").forEach(b => b.classList.remove("active"));
  document.getElementById("btn-" + s).classList.add("active");
}

// Уменьшаем фото
function resizeImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const maxSide = 900;
        let w = img.width, h = img.height;

        if (w > h && w > maxSide) {
          h = h * (maxSide / w); w = maxSide;
        } else if (h > maxSide) {
          w = w * (maxSide / h); h = maxSide;
        }

        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);

        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function generate() {
  document.getElementById("error").innerText = "";
  document.getElementById("result").innerHTML = "Генерация...";

  let photoData = null;
  const file = document.getElementById("photo").files[0];
  if (file) photoData = await resizeImage(file);

  const payload = {
    style: CURRENT_STYLE,
    text: document.getElementById("extra").value,
    photo: photoData
  };

  const res = await fetch("/api/generate", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (!res.ok) {
    document.getElementById("error").innerText = data.error || "Ошибка";
    document.getElementById("result").innerHTML = "";
    return;
  }

  document.getElementById("result").innerHTML = `<img src="${data.image}">`;

  const dl = document.getElementById("download");
  dl.href = data.image;
  dl.style.display = "block";
}
