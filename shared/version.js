// Versao do jogo (13/11, pedido dele): a mesma do package.json (o check confere). O servidor da Rovex le daqui a campanha
// do presente de atualizacao: so maior.menor conta. 0.18 -> 0.19 = novidades + 500 Zions Points; hotfix (0.19.0 -> 0.19.1)
// fica na mesma campanha: nem o popup reabre nem o presente paga de novo.
export const GAME_VERSION = '0.19.1';
export const UPDATE_ZP = 500;
export const updateCampaign = (v = GAME_VERSION) => 'v' + String(v).split('.').slice(0, 2).join('.');
