import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get('requestId');
  
  if (!requestId) {
    return NextResponse.json({ error: 'Missing requestId' }, { status: 400 });
  }

  const relayerBaseUrl = 'https://relayer.testnet.zama.cloud';
  
  const possiblePaths = [
    `/decrypt/${requestId}`,
    `/oracle/result?requestId=${requestId}`,
    `/v1/decrypt/${requestId}`,
    `/api/decrypt/${requestId}`,
    `/decryption/${requestId}`,
    `/oracle/${requestId}`,
    `/decrypt?requestId=${requestId}`
  ];
  
  for (const path of possiblePaths) {
    try {
      const url = `${relayerBaseUrl}${path}`;
      console.log(`Trying path: ${url}`);
      
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log(`Path ${path} returned data:`, data);
        if (data?.plaintexts && data?.signatures) {
          return NextResponse.json({ 
            plaintexts: data.plaintexts, 
            signatures: data.signatures,
            source: path 
          });
        }
        if (data?.result?.plaintexts && data?.result?.signatures) {
          return NextResponse.json({ 
            plaintexts: data.result.plaintexts, 
            signatures: data.result.signatures,
            source: path 
          });
        }
        if (Array.isArray(data?.plaintexts) && Array.isArray(data?.signatures)) {
          return NextResponse.json({ 
            plaintexts: data.plaintexts, 
            signatures: data.signatures,
            source: path 
          });
        }
        
        console.log(`Path ${path} returned data but format doesn't match:`, data);
      } else {
        console.log(`Path ${path} returned error: ${res.status} ${res.statusText}`);
      }
    } catch (e) {
      console.log(`Path ${path} request failed:`, e);
      continue;
    }
  }
  
  return NextResponse.json({ 
    error: 'All API paths failed', 
    requestId,
    tried: possiblePaths 
  }, { status: 404 });
}
