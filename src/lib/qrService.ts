export const generateTableQRUrl = (tenantId: string, tableNumber: number): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/${tenantId}/table/${tableNumber}`;
};

export const generateQRCodeImageUrl = (url: string, size: number = 300): string => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
};

export const downloadQRCodesHTML = (
  tenantId: string,
  restaurantName: string,
  tableCount: number
) => {
  let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${restaurantName} - Table QR Codes</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
          background: #f5f5f5;
        }
        h1 {
          text-align: center;
          color: #333;
          margin-bottom: 10px;
        }
        .subtitle {
          text-align: center;
          color: #666;
          margin-bottom: 30px;
          font-size: 16px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 30px;
          margin-top: 30px;
        }
        .qr-card {
          background: white;
          border: 2px solid #ddd;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          page-break-inside: avoid;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .qr-card h3 {
          margin: 0 0 20px 0;
          font-size: 28px;
          color: #333;
          font-weight: bold;
        }
        .qr-card img {
          width: 220px;
          height: 220px;
          margin: 0 auto;
          display: block;
        }
        .url {
          margin-top: 15px;
          font-size: 11px;
          color: #999;
          word-break: break-all;
          font-family: monospace;
        }
        .instructions {
          background: white;
          border: 2px solid #4CAF50;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
          text-align: center;
        }
        .instructions h2 {
          color: #4CAF50;
          margin-top: 0;
        }
        @media print {
          body {
            background: white;
          }
          .grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .qr-card {
            page-break-inside: avoid;
            box-shadow: none;
          }
          .instructions {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="instructions">
        <h2>📱 How to Use These QR Codes</h2>
        <p>Print this page and place each QR code on the corresponding table.</p>
        <p>Customers can scan the code with their phone camera to view the menu and place orders.</p>
      </div>
      
      <h1>${restaurantName}</h1>
      <p class="subtitle">Table QR Codes - Scan to View Menu & Order</p>
      
      <div class="grid">
  `;

  for (let i = 1; i <= tableCount; i++) {
    const tableUrl = generateTableQRUrl(tenantId, i);
    const qrImageUrl = generateQRCodeImageUrl(tableUrl, 300);
    
    html += `
      <div class="qr-card">
        <h3>Table ${i}</h3>
        <img src="${qrImageUrl}" alt="QR Code for Table ${i}" />
        <p class="url">${tableUrl}</p>
      </div>
    `;
  }

  html += `
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${restaurantName.replace(/[^a-z0-9]/gi, '-')}-QR-Codes.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
