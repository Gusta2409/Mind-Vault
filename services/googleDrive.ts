
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

export class GoogleDriveService {
  private static tokenClient: any = null;
  private static accessToken: string | null = null;
  private static gapiInited = false;
  private static gisInited = false;

  // IMPORTANTE: Como desenvolvedor, você coloca SEU Client ID aqui.
  // Assim o usuário final apenas clica em "Login".
  public static DEFAULT_CLIENT_ID = ''; 

  static async init(clientId: string) {
    const finalClientId = clientId || this.DEFAULT_CLIENT_ID;
    
    if (!finalClientId) {
      throw new Error("Client ID não configurado. O desenvolvedor deve fornecer um Client ID.");
    }

    return new Promise((resolve, reject) => {
      const checkReady = () => {
        if (this.gapiInited && this.gisInited) resolve(true);
      };

      // 1. Inicializa GAPI (para manipular arquivos)
      // @ts-ignore
      gapi.load('client', async () => {
        try {
          // @ts-ignore
          await gapi.client.init({
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
          });
          this.gapiInited = true;
          checkReady();
        } catch (e) {
          reject(e);
        }
      });

      // 2. Inicializa GIS (para autenticação)
      // @ts-ignore
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: finalClientId,
        scope: SCOPES,
        callback: (resp: any) => {
          if (resp.error) {
            console.error("Auth error:", resp.error);
            return;
          }
          this.accessToken = resp.access_token;
          // @ts-ignore
          gapi.client.setToken({ access_token: this.accessToken });
        },
      });
      this.gisInited = true;
      checkReady();
    });
  }

  static async authenticate(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.tokenClient) return resolve(false);

      // Limpa token antigo se houver
      this.accessToken = null;

      this.tokenClient.requestAccessToken({ prompt: 'consent' });
      
      const checkAuth = setInterval(() => {
        if (this.accessToken) {
          clearInterval(checkAuth);
          resolve(true);
        }
      }, 500);

      // Timeout após 2 minutos
      setTimeout(() => {
        clearInterval(checkAuth);
        if (!this.accessToken) resolve(false);
      }, 120000);
    });
  }

  static async findOrCreateFolder(folderName: string) {
    // @ts-ignore
    const resp = await gapi.client.drive.files.list({
      q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id)',
    });

    if (resp.result.files && resp.result.files.length > 0) {
      return resp.result.files[0].id;
    }

    // @ts-ignore
    const createResp = await gapi.client.drive.files.create({
      resource: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });
    return createResp.result.id;
  }

  static async saveFile(folderId: string, fileName: string, data: any) {
    // @ts-ignore
    const existing = await gapi.client.drive.files.list({
      q: `'${folderId}' in parents and name = '${fileName}' and trashed = false`,
      fields: 'files(id)',
    });

    const fileId = (existing.result.files && existing.result.files.length > 0) ? existing.result.files[0].id : null;
    
    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      parents: fileId ? undefined : [folderId],
    };

    const fileContent = JSON.stringify(data);
    const boundary = 'foo_bar_baz';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        close_delim;

    const url = fileId 
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

    const resp = await fetch(url, {
      method: fileId ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });
    
    if (!resp.ok) {
      const errorData = await resp.json();
      console.error("Upload error details:", errorData);
      throw new Error("Falha ao sincronizar com Google Drive");
    }
  }

  static async readFile(folderId: string, fileName: string) {
    // @ts-ignore
    const existing = await gapi.client.drive.files.list({
      q: `'${folderId}' in parents and name = '${fileName}' and trashed = false`,
      fields: 'files(id)',
    });

    if (!existing.result.files || existing.result.files.length === 0) return null;

    const fileId = existing.result.files[0].id;
    const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });
    return await resp.json();
  }

  static async logout() {
    if (this.accessToken) {
      // @ts-ignore
      google.accounts.oauth2.revoke(this.accessToken, () => {
        this.accessToken = null;
      });
    }
  }
}
