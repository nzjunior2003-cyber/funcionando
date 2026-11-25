// Equipe da Seção de Apoio e Suprimento (SAS): alimenta o menu "Selecionar da equipe" nas
// assinaturas. Ao escolher uma pessoa, nome, nome de guerra, cargo e função são preenchidos
// (e continuam editáveis). Para incluir ou alterar alguém, edite esta lista.
export interface MembroEquipe {
    nome: string;
    nomeGuerra: string;
    cargo: string;   // igual a uma das opções do menu de cargos
    funcao: string;
    grupo: 'Chefia' | 'Auxiliares' | 'Voluntários Civis';
}

const AUX = 'Auxiliar da Seção de Apoio e Suprimento';
const VC = 'Voluntário Civil da Seção de Apoio e Suprimento';

export const equipeSecao: MembroEquipe[] = [
    { grupo: 'Chefia', nome: 'Manoel Nazareno Oliveira de Souza Júnior', nomeGuerra: 'Manoel', cargo: '1° TEN QOABM', funcao: 'Chefe da Seção de Apoio e Suprimento' },

    { grupo: 'Auxiliares', nome: 'Antonio Carlos Monteiro Amoras Júnior', nomeGuerra: 'Amoras', cargo: '2° SGT QBM', funcao: AUX },
    { grupo: 'Auxiliares', nome: 'Carlena de Nazaré dos Reis Figueiredo', nomeGuerra: 'Carlena', cargo: '2° SGT QBM', funcao: AUX },
    { grupo: 'Auxiliares', nome: 'Mauro Robson Moraes Monteiro', nomeGuerra: 'Robson', cargo: '2° SGT QBM', funcao: AUX },
    { grupo: 'Auxiliares', nome: 'Leonilson Bezerra Rosa', nomeGuerra: 'Bezerra', cargo: '2° SGT QBM', funcao: AUX },
    { grupo: 'Auxiliares', nome: 'Denilson Pereira Sodré', nomeGuerra: 'Sodré', cargo: '3° SGT QBM', funcao: AUX },
    { grupo: 'Auxiliares', nome: 'Juliana Batista Guerra', nomeGuerra: 'Juliana Guerra', cargo: '3° SGT QBM', funcao: AUX },
    { grupo: 'Auxiliares', nome: 'Jorge Fernando Neves Nascimento', nomeGuerra: 'Neves', cargo: 'SD QBM', funcao: AUX },
    { grupo: 'Auxiliares', nome: 'Jessyca Guerra de Oliveira', nomeGuerra: 'Guerra', cargo: '3° SGT QBM', funcao: AUX },

    { grupo: 'Voluntários Civis', nome: 'Ágatha Gabrielly Rodrigues Pinto', nomeGuerra: 'Ágatha', cargo: 'Vol. Civil', funcao: VC },
    { grupo: 'Voluntários Civis', nome: 'Emilly Vitoria Paes Dos Santos', nomeGuerra: 'Emilly', cargo: 'Vol. Civil', funcao: VC },
    { grupo: 'Voluntários Civis', nome: 'Grazielly Stela de Oliveira Viana', nomeGuerra: 'Grazielly', cargo: 'Vol. Civil', funcao: VC },
    { grupo: 'Voluntários Civis', nome: 'Ana Julya da Cruz Brito', nomeGuerra: 'Ana Cruz', cargo: 'Vol. Civil', funcao: VC },
    { grupo: 'Voluntários Civis', nome: 'Arnon e Silva dos Santos', nomeGuerra: 'Arnon', cargo: 'Vol. Civil', funcao: VC },
    { grupo: 'Voluntários Civis', nome: 'Angela Hikaru Miyamoto', nomeGuerra: 'Angela', cargo: 'Vol. Civil', funcao: VC },
    { grupo: 'Voluntários Civis', nome: 'Giovanna Louise Miranda Rodrigues Morais', nomeGuerra: 'Louise', cargo: 'Vol. Civil', funcao: VC },
    { grupo: 'Voluntários Civis', nome: 'Ingrid Helena Correa Pantoja', nomeGuerra: 'Helena', cargo: 'Vol. Civil', funcao: VC },
];
