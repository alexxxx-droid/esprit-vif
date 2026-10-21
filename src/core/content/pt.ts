import type { ShapeKind } from '../games/shapes';
import { adj, C, nom, verbe, wordList } from './helpers';
import type { LangContent, LangGrammar, RuleShape } from './index';

/**
 * Contenus des jeux en portugais du Brésil (pt-BR, le joueur est appelé « você ») : voir
 * `LangContent` (index.ts) pour la règle de chaque champ. Des mots et des idées choisis pour le
 * portugais, pas traduits mot à mot ; l'orthographe suit l'accord de 1990 (ideia, geleia, plateia).
 */

// Anagrammes : mots courants de 5 à 7 lettres, sans accent, cédille ni tilde. Quand deux mots ont
// les mêmes lettres, les deux sont là (PRATO, PORTA, PARTO, TROPA, RAPTO ; CALOR, CLARO, COLAR, CORAL).
// Écartés : les mots dont le mélange peut former un mot accentué privé de ses accents (ADEUS → SAUDE,
// BARCO → BRACO) ou une forme verbale très courante (FORMA → FORAM, PASSO → POSSA).
const WORDS = wordList(`
  ABRIL ACASO ACIMA ADEGA AGORA AJUDA ALTAR ALUNO AMIGO AMORA ANDAR ANZOL ARARA AREIA ARENA AROMA
  ARROZ ASSAR ASSIM ASTRO ATLAS ATRIZ AZEDO BACON BAILE BALDE BAMBU BANCO BANDA BANHO BARBA BARCA
  BARRO BATOM BEBER BEIJO BEIRA BICHO BOMBA BRASA BRAVO BREJO BRIGA BRISA BROTO BRUXA BURRO BUSCA
  CABRA CACHO CAIXA CALDO CALMA CALOR CAMPO CANTO CARNE CARTA CASAL CASTO CATAR CAUDA CEDRO CERCA
  CERVO CHATO CHAVE CHUVA CIFRA CINTO CINZA CIRCO CISNE CLARO CLIMA COFRE COLAR CONTA CORAL CORDA
  CORPO CORVO COSTA COURO CREDO CRIME CULPA CUPIM CURSO CURVA DEDAL DENTE DEPOR DEVER DIABO DISCO
  DRAMA DUCHA DUPLA ELITE EXAME FALAR FALTA FARDA FAROL FATAL FATIA FAVOR FERRO FESTA FIBRA FICAR
  FILHO FINAL FIRME FLORA FOLGA FORNO FORTE FRASE FREIO FRUTA FRUTO FUNDO FURTO GAITA GALHO GANSO
  GARFO GAROA GARRA GEADA GENTE GERAR GESSO GOLFE GOLPE GORDO GOSTO GRAVE GRILO GRITO GRUPO GRUTA
  HOMEM HORTA HOTEL HUMOR IDADE IDEIA IGUAL IMPOR JARRA JEITO JOGAR JOVEM JULHO JUNHO JUSTO LAGOA
  LARGO LEITE LENHA LENTO LEQUE LETRA LHAMA LIBRA LIMPO LINHA LISTA LITRO LIVRO LOUCO LOUSA LUGAR
  LUTAR MACIO MAGRO MALHA MANSO MANTO MARCA MARCO MASSA MEDIR MENTE MILHO MISSA MOEDA MOLDE MOLHO
  MONGE MONTE MORNO MORRO MORTO MOTOR MUNDO MUSEU MUSGO NADAR NARIZ NAVIO NERVO NINHO NOITE NOIVA
  NOIVO NUVEM OLHAR OMBRO ONTEM OPTAR OSTRA OUTRO PADRE PALCO PALHA PANDA PAPEL PARDO PARTO PASTA
  PAVOR PEDRA PEITO PEIXE PERDA PERNA PERTO PIANO PILHA PINHO PISTA PLANO PLUMA POBRE PODAR PODER
  PODRE POEMA POLVO PONTE PONTO PORCO PORTA PORTE PORTO POSTE POTRO POUCO PRADO PRAIA PRATA PRATO
  PRAZO PRESO PRETO PRIMO PROVA PUDIM PULGA PULSO PUNHO QUEDA QUILO RAIVA RAPAZ RAPTO REGAR REGRA
  REINO RENDA RESTO RITMO ROCHA ROLHA ROMBO ROSTO ROUCO RUBRO SABER SABOR SABRE SALSA SAMBA SAUNA
  SELVA SENHA SERRA SETOR SINAL SOBRA SONHO SOPRO SORTE SUAVE SURDO TACHO TAMPA TAPAR TARDE TECLA
  TELHA TEMPO TERRA TIGRE TINTA TOCHA TOLDO TONEL TORNO TORPE TORRE TORSO TOSSE TOUCA TOURO TRAPO
  TREVO TRIGO TRONO TROPA TRUFA TURMA TURNO URUBU USINA VAGEM VAIAR VALSA VAPOR VELHO VENTO VERBO
  VERDE VETOR VIDRO VINHO VIRAR VISTA VIVER VOTAR VULTO ZEBRA

  ABELHA ABRIGO ACORDE ACUDIR AGOSTO AGULHA ALEGRE ALFACE AMARGO AMEIXA ANTIGO APOSTA ATALHO ATLETA
  ATRASO AZEITE BALEIA BANANA BARATA BARRIL BATATA BELEZA BEXIGA BIGODE BOMBOM BONECO BRILHO BRINCO
  BRINDE BURACO CABELO CABIDE CADEIA CADELA CAMADA CAMELO CAMISA CANECA CANETA CANTOR CARETA CASACO
  CAVALO CEBOLA CENTRO CEREJA CHEIRO CHUMBO CIDADE CINEMA COELHO COLEGA COLHER COLINA COMETA COMIDA
  CONCHA CONTAR CONTER CONTRA CORRER CORUJA CUIDAR DESEJO DORMIR DOUTOR ENIGMA ESCADA ESCOLA ESCOVA
  ESPADA ESPIGA ESPOSA ESTADO ESTOJO FATUAL FERIDA FIGURA FIVELA FLAUTA FLECHA FRANGO FUTURO GAVETA
  GELADO GELEIA GIRAFA GOIABA GRAFIA GUERRA IGREJA IMAGEM JANELA JANTAR JARDIM JAVALI JOELHO JORNAL
  LANCHE LATIDO LEGADO LEGUME LEITOR LIMPAR LUNETA MACACO MAGOAR MALETA MANCHA MARIDO MARUJO MENINA
  MENINO MESTRE METADE MINUTO MOINHO NOVELA OBJETO OCEANO ORELHA OUTONO OUVIDO OVELHA PANELA PAREDE
  PARQUE PASTEL PATINS PEDIDO PEPINO PERIGO PESSOA PETECA PIJAMA PILOTO PINCEL PINTOR PIPOCA POMADA
  PRAZER PREZAR QUADRO QUARTO QUATRO QUEIXO RAINHA RAPOSA RECADO RIACHO SACOLA SALADA SAPATO SEMANA
  SEREIA SOMBRA TALHER TAPETE TEATRO TECIDO TIGELA TIJOLO TOALHA TOMATE TRATOR TRISTE TROTAR TUCANO
  UMBIGO VELUDO VENENO VIAGEM XADREZ XAROPE

  ABACATE ABACAXI ABRIGAR ALEGRIA ALERGIA AMIZADE AUSTERO AVENIDA AZULEJO BANDEJA BARALHO BARRIGA
  BARULHO BATERIA BOLACHA CABRITO CAMINHO CANGURU CANTIGA CARACOL CARINHO CASCATA CASTELO CHICOTE
  CHILENO CHINELO CIGARRA CINTURA COLMEIA COMADRE CONVITE CORAGEM CORANTE CORNETA CORREIO CORRIDA
  CORTINA COSTELA COZINHA CRIADOR DEFEITO DESATAR DESENHO DESTINO DOMINGO ENFEITE ENTERRO ESCOLTA
  ESPELHO ESPINHO ESQUILO ESTANTE ESTELAR ESTOURO ESTRADA ESTRELA EXILIAR FARINHA FAZENDA FOGUETE
  FORMIGA FORTUNA GAIVOTA GALERIA GALINHA GARAGEM GARRAFA GENGIVA GERENTE GOLPEAR GRAVATA HIPNOSE
  INIMIGO INVERNO JANEIRO JANGADA JOGADOR LACTOSE LAGARTO LAGOSTA LARANJA LAREIRA LEMBRAR LIXEIRA
  MADEIRA MARTELO MEDALHA MERCADO MINHOCA MOCHILA MOCINHA MODULAR MOLDURA MORANGO MORCEGO NAVALHA
  NEBLINA NOTURNO OFICINA ORVALHO OUTUBRO PALAVRA PANTERA PANTUFA PASSEIO PENEIRA PEQUENO PERFUME
  PIMENTA PLANETA PLATEIA POLEGAR POSSUIR QUADRIL QUINTAL RECEITA REGENTE REPOLHO RETRATO REVISTA
  RODOVIA SALGADO SEGREDO SEGUNDO SEMENTE SENTIDO SETENTA SOBRADO SOLDADO SORRISO SORVETE SUSPIRO
  TAXISTA TECLADO TELHADO TEMPERO TERRENO TESOURA TESOURO TORRADA VARANDA VELEIRO VERDADE VESTIDO
  VIOLETA VIOLINO VITRINE VIZINHO ZANGADO
`);

// Anagrammes, niveaux 21 et plus : mots de 8 lettres, mêmes règles (PRESENTE et SERPENTE,
// CONVERSA et CONSERVA ont les mêmes lettres : les deux sont là).
const LONG_WORDS = wordList(`
  ACADEMIA ADVOGADO AGASALHO ALFINETE ALIMENTO ALMOFADA AMBIENTE AMENDOIM ANTERIOR APARELHO APRENDER
  AQUARELA ARMADURA ASSOALHO ATRASADO AUMENTAR AVENTURA AVESTRUZ AZEITONA BANDEIRA BANHEIRA BANHEIRO
  BARBEIRO BASQUETE BATIZADO BISCOITO BOCHECHA BOMBEIRO BORRACHA CACHORRO CAMARADA CAMISETA CAMPANHA
  CANTEIRO CAPACETE CAPOEIRA CAPRICHO CARAMELO CARNAVAL CARNEIRO CARRINHO CARTEIRA CASCALHO CASTANHA
  CHAVEIRO CHOCALHO CHUVEIRO COBERTOR COLHEITA COLORIDO COMBINAR CONCERTO CONCRETO CONDESSA CONECTOR
  CONHECER CONSELHO CONSERVA CONTENTE CONVERSA COQUEIRO CORREDOR CORRENTE COTOVELO COZINHAR CRIATURA
  CRUZEIRO CURATIVO DELEGADO DELICADO DESCANSO DEZEMBRO DIAMANTE DINHEIRO DISFARCE ELEFANTE ELEVADOR
  EMBRULHO EMPOSSAR ENCONTRO ENVELOPE ESCOLHER ESCRITOR ESPECIAL ESQUERDO ESTRANHO FABULOSO FAMILIAR
  FANTASIA FANTASMA FERREIRO FERROVIA FERRUGEM FIGURINO FLAMINGO FLORESTA FLORISTA FOGUEIRA FOLHAGEM
  GARGANTA GASOLINA GELATINA GENEROSO GIRASSOL GOIABADA GOLFINHO GRAVIDEZ GUITARRA HARMONIA HERDEIRO
  HOSPITAL INSTANTE INVENTOR JOANINHA LANTERNA LEITEIRO LEMBRETE LENHADOR LEOPARDO LIMONADA MANDIOCA
  MANTEIGA MARIPOSA MASSAGEM MATERIAL MELANCIA MERGULHO MINISTRO MOCIDADE MONTANHA MOSQUITO NAMORADO
  NOVEMBRO NOVIDADE OBRIGADO OCIDENTE OLIVEIRA ORIENTAR PALMEIRA PANQUECA PAPAGAIO PARAFUSO PARCEIRO
  PASSAGEM PASTILHA PATINETE PATRULHA PEDREIRO PENTEADO PERFEITO PERGUNTA PESADELO PESCADOR PESCARIA
  PINHEIRO PIRULITO PLANALTO POLTRONA PONTEIRO PORTEIRO PREFEITO PRESENTE PRIMEIRO PRINCESA PROBLEMA
  PROCURAR PROGRAMA PROMESSA PROTEGER PULSEIRA QUADRADO QUARENTA QUEBRADO QUEIMADA QUITANDA RABANETE
  RAPADURA RECHEADO REFRESCO RESPEITO RESPOSTA SABONETE SALSICHA SARDINHA SELVAGEM SEMESTRE SERENATA
  SERPENTE SETEMBRO SIMPATIA SINFONIA SOBRINHO SOLTEIRO SOUVENIR SURPRESA TAMBORIM TELEFONE TEMPORAL
  TERMINAL TERREIRO TINTEIRO TORCEDOR TORNEIRA TOUCINHO TRABALHO TRAVESSA TRIBUNAL TRISTEZA TROMBONE
  TROPEIRO TROVOADA UNIFORME UNIVERSO VAQUEIRO VASSOURA VENCEDOR VENTANIA VERGONHA VERMELHO VIAJANTE
  VITAMINA
`);

// Autres mots courants (jamais des réponses) : un leurre de Lettre manquante ne doit former aucun
// d'eux. Les mots accentués comptent aussi sans leurs accents (MAÇÃ bloque MACA).
const KNOWN_WORDS = wordList(`
  ABAIXO ABERTO ABRIR AÇÃO ACENDA ACENDE ACENDO ACHA ACHAR ACRE AÇÚCAR ADEUS ADVOGADA AFETO AGENDE
  AGENTE AGITO ÁGUA AINDA AIPO ALÇA ALGA ALGUM ALHO ALMA ALTO ALTURA AMANHÃ AMAR AMARELA AMIGA AMOR
  ÂNCORA ANEL ÂNGULO ANIMAL ANJO ANOS ANTA ANTES ANTRO ÂNUS APAGADOS APELO APITO APOSTADOR APOSTO
  APURO ARAME ARCO ARGENTINO ARGOLA ÁRVORE ASAS ASNO ASSINADO ATENDA ATOR ATUM AULA AUTO AVAL AVES
  AVIÃO AVISO AVÓ AVÔ AZUL BABA BACANA BAITA BAIXA BAIXO BALA BALADA BALÃO BALÉ BALSA BANQUETE BARATO
  BARCO BARDO BARRACA BASCO BATALHÃO BATER BATUTA BECA BELA BELO BENTA BENTO BERRO BESTA BETA BICA
  BICO BILE BIRRA BIZARRO BOBA BOBO BOCA BODE BOIA BOLA BOLO BOLSA BOLSO BOMBO BONÉ BONECA BONITA
  BONITO BORA BORRADA BORRASCA BOTA BOTÃO BOTE BOTO BRANCA BRANCO BRINCAR BRIO BROCA BRONCA BRONCO
  BRUTA BUNDA BURRA BURRADA CABALA CABANA CABEÇA CABELEIREIRA CABEM CABINA CABO CAÇA CAÇADA CACO CADA
  CADEIRA CADETE CAFÉ CAGA CAGUE CAIA CAIRÁ CAIS CAJU CALA CALADO CALÇA CALCINHA CALDA CALDEIRA CALE
  CALHAR CALIFA CALVO CAMA CÂMARA CAMINHA CANA CANAL CANÇÃO CANELA CANTA CANTADO CANTAR CANTORA CAPA
  CAPIM CAPITÃ CAPITÃO CAPTA CARA CARECA CARGA CARGO CARGUEIRO CARO CARREIRA CARRETA CARRINHA CARROÇAS
  CARTEIRO CARTINHA CASA CASACA CASADO CASCA CASCAS CASE CASEIRA CASO CASPA CASTAS CASTELA CASTIGO
  CAVA CAVALINHO CAVAR CEDO CEGO CEGUEIRA CELA CENTO CERA CERCADO CERTA CERTEIRO CERTO CERVEJA CESTA
  CESTAS CETRO CÉU CEVADA CHÁ CHALÉ CHAMADA CHAMAR CHÃO CHAPADO CHAPÉU CHARADA CHEFA CHEFE CHEGADA
  CHEGAR CHEIA CHEIO CHICHI CHILI CHITA CHOCADA CHORAR CHOVA CHOVE CHUCHO CHULÉ CHUPA CHUPADA CHUTA
  CICLOPE CICUTA CIDRA CIGARRO CIMA CIMENTO CINCO CINTA CLARA CLAREIRA CLICA COBRA COBRE COBRINDO
  COBRO COCA COCO COLA COLADA COLAGEM COLCHA COLE COLEIRA COLETA CÓLICA COLO COLUNA COMA COMBINA COMBO
  COME COMER COMERÁ COMETE COMETI COMETO CÔMICA COMITÊ COMO COMPRA COMPRAR COMUM CONDE CONTADA COPA
  COPINHO COPO CORA CORAÇÃO CORAR CORO COROA CORRA CORRE CORRETO CORRI CORRO CORSO CORTA CORTAR CORTE
  CORTO COSA COTA COUBE COVA COXO COZINHEIRA CRASE CREIA CREME CRESCER CRIANÇA CRIAR CRIE CRUA CRUZ
  CUBANA CUBO CUBRA CUCA CUCO CULPE CULPO CULTA CULTURA CUPOM CURA CURTA CURTI CURTO CURVE CURVO
  CUSTAS CUSTO CUSTOS DADO DAMA DANÇA DATA DATADA DECERTO DEDO DEITAR DEITO DEIXAR DEPOIS DERRETA
  DERROTA DERROTE DESCER DESDE DESERTA DESTA DESTE DETENTO DEUSA DEVE DEVO DIAS DICA DIFÍCIL DIGO
  DIZER DOCA DOCE DODÔ DOJO DONA DONDE DONO DORME DRENO DROGA DUMA DUNA DURA DURO ELEGANTE ELMO
  ENFERMEIRA ENGANADOR ENGENHEIRA ENGENHO ENGOLE ENTANTO ENTRA ENTRAR ENTRE ENTREGA ENTRO ENTUSIASTA
  ERAM ERRADO ERRANDO ERVA ESCALA ESCALADO ESCAPA ESCAPADA ESCREVER ESCURA ESCURO ESPALHA ESPANTA
  ESPERA ESPERAR ESPERE ESPERO ESPINHA ESPOSO ESQUADRA ESQUIMÓ ESSE ESTANDE ESTAR ESTE ESTENDA ESTENDE
  ESTOLA ESTUDAR EVITO FACA FÁCIL FADA FALADOR FALE FALHA FALHO FAMA FARO FATO FAVA FAZER FECHADO
  FECHAR FEIA FEIJÃO FEIO FEIRA FEITA FEITO FELIZ FERA FERRADO FETO FICHA FIGA FIGO FILA FILHA FILMA
  FINO FITA FOCA FOCADA FOCO FOGÃO FOGO FOLHA FOME FORA FORCA FORMA FOTO FRACA FRACO FRIO FUGA FUGIR
  FUMO GADO GAGO GAGUEIRA GALO GAMA GANGUE GANHAR GAROTA GAROTO GASTAR GATA GATO GELO GERA GESTO
  GESTOR GIRAVA GOLA GOLE GOLEIRO GOMA GORDA GORILA GOSTAR GOSTAS GOSTOS GOTA GOVERNA GRAMA GRANDE
  GRANITO GRÃO GRATO GRAVA GRÁVIDO GRAVO GRITA GRITAR GROSSO GROTA GRUDA GRUDE GUARDAR GUIA GUIADA
  GULA HERDA HINO HORA HORDA HOSPEDAR ILHA INFAME INSETO INVEJO IRMÃ IRMÃO ISENTO JÁ JATO JOGO JOGUE
  JUBA JULGO JUNCO JUNTAR JUNTO JURO LACA LADEIRA LADO LAGO LAMA LANCE LÁPIS LARGA LATA LAVA LAVADEIRA
  LAVANDO LAVAR LEÃO LEDO LEGO LEIA LEITO LEMA LENTA LEVANDO LEVANTA LEVAR LEVE LIÇÃO LIGAR LIGO LIGUE
  LIMA LIMÃO LIMO LIMPA LINDA LINDO LINHO LIRA LISO LOBA LOBO LOCO LODO LOGO LOJA LOMBO LONA LONGE
  LONGO LOTE LOUCA LOUÇA LOURO LUAR LUTA LUVA LUXO MAÇÃ MACACA MACIÇO MÃE MAGIA MAGO MÁGOA MAGRA
  MAGRINHO MAIOR MALA MALHADO MALTA MALTE MAMA MAMÃE MANCAR MANDAR MANHÃ MANTA MANTENHA MANTINHA
  MANTRA MÃO MAPA MARCADA MARCADO MARGARIDA MARGARINA MARGEM MARMELO MATA MATAR MATEM MATO MECA MEDE
  MEDI MEDO MEGA MEIA MEIO MELECA MEMO MENOR MENOS MERA MERGULHA MERGULHE MÉRITO MESA MESMO META METO
  METRO MEXER MILHA MIMO MINA MITO MOÇA MOÇO MODA MODO MOLA MOLE MOLHAR MOMENTO MONTANDO MONTANTE MORA
  MORAR MORDE MORRE MORRER MORTA MORTE MOSCA MOSTRAR MOTA MOTE MOTEL MOTO MOURO MOVEM MUDA MUDAR MUDO
  MUITO MULA MULHER MURO MURRO MUSA MÚSICA NABO NADA NANO NASÇA NASCENTE NASCER NATA NATO NAVE
  NEBULOSO NEGA NELA NELE NENÊ NESTA NETO NEVA NEVE NÍVEL NOME NONA NONO NORMAL NORTE NOSSA NOTA NOTO
  NOVA NOVE NOVO NUCA NULA NÚMERO NUNCA ÓBITO OBRA OITO OLHA OLHE ONÇA ONDA ÔNIBUS OPERADOR ORAL ORDEM
  ORGULHA ORGULHE OSSO OURO OUVIR PÁ PACA PADEIRO PAGAR PAGARIA PAGO PAIS PAÍS PALA PALADAR PÁLIDO
  PALITO PANCADA PANO PÃO PAPA PARA PARADA PARADO PARAGEM PARAR PARARIA PARCO PARGO PARREIRA PARTE
  PARTEIRA PARTIR PASSAR PÁSSARO PASSO PASTOR PATA PATETA PATO PAVÊ PAVIO PÉ PEÃO PEÇA PECADOR PEDAÇO
  PEDEM PEDIR PEDREIRA PEGAMOS PEGAR PEGUE PEIDO PELA PELE PENA PENSAR PENTE PEPITA PEQUENA PERA PERCA
  PERCO PERDE PERDER PERO PERSA PERU PESA PESCA PESCADO PESCAR PESO PIÃO PICA PICADOR PICANHA PICO
  PILOTA PILOTE PINTAR PINTORA PINTURA PIPA PIPI PIRA PIRADO PIRATA PISAR PISCADA PISO PLANEADO PLANTA
  POÇA POÇO PODE PODERIO POLÍCIAS POLO POMBA POMPA PONDO PORÁ PORCA PORQUE PORRE PORTAL POSSA POTE
  POUCA POVO PRAÇA PRATEADA PREÇO PREGO PRELO PRENSA PRETA PROCESSAR PROMETA PRONTO PROSA PULAR
  PULARIA PULE PUMA PUNA PUNE PUNHADO PURA PURÊ PURO QUADRADA QUADRIS QUANDO QUEBRAR QUEIJO QUEIMA
  QUEIXA QUENTE QUERER RABO RAÇA RACHADO RAIA RAIO RALÉ RAMO RÁPIDO RASA RATO RECITE REDE REIS RELATAR
  RELÓGIO REMA REME REMO RESTA RETA RETO REVENDA REZA RICA RICO RICOS RIMA RISCO RISOTO ROCA RODA RODE
  ROLA ROLO ROMA ROQUEIRO ROSA ROSCA ROTA ROUPA RUGA RUIM RUIVA RUIVO RUMO RUNA SABÃO SACA SACADA SACO
  SAFENA SAGA SAIA SAIO SAIR SAIU SALA SALEIRO SALINA SALTAR SALTO SANGUE SAPATEIRO SAPO SARRO SAÚDE
  SECAR SECO SEDA SEDE SEGUE SEGUIR SELA SELO SEMPRE SENHOR SENHORA SENTAR SENTE SENTIR SENTO SERVA
  SERVO SESTA SETA SIGO SIMPLES SINO SÓ SOBRE SOCA SOCO SOFÁ SOFRA SOGRA SOJA SOL SOLA SOLO SOLTA
  SOLTO SOMA SONECA SONHADO SONHAR SÔNICA SONO SOPA SOPRA SOTAQUE SUBA SUBIR SUBMARINA SUCO SUJA SUJAR
  SUJO SUMO SUOR SURPRESO TABACO TABU TAÇA TACO TALO TAMBÉM TAMPAR TATO TATU TAVERNA TEIA TELA TEMA
  TEMO TEMOR TENOR TENRO TENTA TENTE TENTO TERMO TERNO TESTA TESTE TETA TETO TEVE TÍMIDAS TINA TIPO
  TIRAR TIRAVA TIRO TOCA TOCADA TOCAR TOCO TODA TODINHO TODO TODOS TOGA TOLA TOLHER TOLO TOMAR TOMBO
  TOPO TORA TORÇA TORCE TORÇO TORNA TORNARÁ TORTO TOSCO TOSSIR TOTAL TRAGA TRAIA TRAMA TRATA TRATAR
  TRATOS TRAVESSO TRAVESTI TRAZER TRECO TREM TREME TREMO TRENZINHO TREPA TRÊS TRETA TRINA TRIO TROCA
  TROCAR TROCO TROMBETA TROMBOSE TUBO TUDO TULE TÚNICA TURBO TURNÊ TUTANO TUTU UNHA URNA URSA URSINHO
  URSO USAR VACA VAGA VAGAM VALA VALE VALEM VÁLIDO VARA VARIZ VASO VAZIA VAZIO VELA VELHA VENCE VENÇO
  VENDA VENDE VENDER VENDO VENHA VENHO VERÃO VERBA VERME VERMELHA VERVE VESTIDA VESTIR VETO VIAJAR
  VIBRA VIDA VIGA VILA VINDA VINDO VINHA VINIL VIOLA VITELA VOAR VOLANTE VOLTAR VOSSA VOTO XALE ZERO
`);

// Suites grossières qu'un mélange ou un leurre ne doit jamais afficher.
const RUDE = wordList(`
  PUTA PUTO PORRA MERDA BOSTA FODA FODE FODI CARALHO CACETE BUCETA BOCETA PIROCA XOXOTA PUNHETA
  BOQUETE VIADO BICHA CORNO ESCROTO TESAO PORNO SEXO ESTUPRO NAZI PENIS CUZAO CAGA CAGO CAGUE PEIDO
  PEIDA MIJO MIJA
`);

/** Les formes de genre féminin (les noms du dictionnaire : estrela, cruz, lua, bandeira). */
const FEMININE: ReadonlySet<ShapeKind> = new Set<ShapeKind>(['star', 'cross', 'moon', 'flag']);

/** Le pluriel d'un nom : coração → corações, cruz → cruzes, círculo → círculos. */
function pluralOf(name: string): string {
  if (name.endsWith('ão')) return `${name.slice(0, -2)}ões`;
  if (/[rz]$/.test(name)) return `${name}es`;
  if (name.endsWith('l')) return `${name.slice(0, -1)}is`;
  return `${name}s`;
}

/** « cheio », « vazada », « cheias »… accordé au genre de la forme. */
function fillWord(shape: ShapeKind, filled: boolean, plural: boolean): string {
  const word = `${filled ? 'chei' : 'vazad'}${FEMININE.has(shape) ? 'a' : 'o'}`;
  return plural ? `${word}s` : word;
}

/** Une énumération : « a », « a e b », « a, b e c ». */
function list(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

/** « nos círculos cheios », « nas estrelas » : la forme au pluriel, avec « em » contracté. */
function inThe({ shape, name, fill }: RuleShape): string {
  const filled = fill ? ` ${fillWord(shape, fill === 'filled', true)}` : '';
  return `${FEMININE.has(shape) ? 'nas' : 'nos'} ${pluralOf(name)}${filled}`;
}

const grammar: LangGrammar = {
  fillWord,
  theShape: (shape, name) => `${FEMININE.has(shape) ? 'a' : 'o'} ${name}`,
  describeShape: ({ shape, filled, rotation }, name) => {
    const base = `${name} ${fillWord(shape, filled, false)}`;
    return rotation ? `${base}, girad${FEMININE.has(shape) ? 'a' : 'o'} ${rotation}°` : base;
  },
  countShapes: (_shape, name, count) => `${count} ${pluralOf(name)}`,
  describeRule: (parts, inverted) => {
    const shapes = list(parts.map(inThe));
    return inverted ? `Toque em tudo, exceto ${shapes}` : `Toque ${shapes}`;
  },
  list,
};

const content: LangContent = {
  anagrams: {
    words: WORDS,
    longWords: LONG_WORDS,
    // Les lettres les plus fréquentes du portugais.
    decoyLetters: 'AEOSRINDMUTCLP',
  },
  lettre: {
    consonants: 'BCDFGLMNPRSTV',
  },
  // Les mots de 8 lettres des Anagrammes ne comptent qu’à partir du niveau 21 : on les ajoute pour les niveaux 1 à 20.
  knownWords: [...KNOWN_WORDS, ...LONG_WORDS],
  rude: RUDE,
  // `plural` complète « Anterior: “…” entre ${plural} » : sans article.
  categories: [
    C('fruits', 'Fruta', 'frutas', 'nourriture', 'maçã pera cereja morango banana abacaxi kiwi uva melancia melão framboesa mirtilo ameixa figo goiaba mamão maracujá tangerina pêssego caju jabuticaba acerola carambola lichia coco limão'),
    C('legumes', 'Legume ou verdura', 'legumes ou verduras', 'nourriture', 'cenoura beterraba abobrinha berinjela chuchu quiabo pepino brócolis couve alface espinafre repolho rúcula agrião cebola batata mandioca inhame abóbora ervilha vagem nabo rabanete aspargo couve-flor pimentão'),
    C('desserts', 'Sobremesa', 'sobremesas', 'nourriture', 'bolo torta pudim sorvete brigadeiro mousse pavê quindim cocada gelatina rabanada canjica sagu churros brownie tiramisu manjar ambrosia picolé crepe merengue'),
    C('boissons', 'Bebida', 'bebidas', 'nourriture', 'café chá leite suco água refrigerante limonada laranjada achocolatado guaraná refresco vinho cerveja sidra soda ponche caipirinha smoothie licor chimarrão'),
    C('sauvages', 'Animal selvagem', 'animais selvagens', 'animaux', 'leão tigre urso lobo raposa girafa zebra elefante macaco cervo javali pantera hipopótamo rinoceronte canguru gorila castor esquilo guepardo lince leopardo coala onça tamanduá capivara lontra alce hiena tatu'),
    C('ferme', 'Animal da fazenda', 'animais da fazenda', 'animaux', 'vaca vitelo porco ovelha cabra cavalo burro jumento jegue touro bezerro cordeiro carneiro égua pônei mula boi leitão bode cabrito potro coelho'),
    C('oiseaux', 'Ave', 'aves', 'animaux', 'pardal pombo águia coruja corvo cisne papagaio falcão pelicano flamingo avestruz pinguim abutre gaivota beija-flor pica-pau pavão cegonha garça tucano arara periquito sabiá canário urubu andorinha gavião'),
    C('poissons', 'Peixe', 'peixes', 'animaux', 'salmão atum truta tubarão sardinha carpa bacalhau arenque enguia cavala espadarte linguado pescada tilápia robalo piranha tambaqui pirarucu lambari garoupa badejo merluza anchova corvina baiacu barracuda'),
    C('insectes', 'Inseto', 'insetos', 'animaux', 'abelha formiga mosca borboleta mosquito vespa joaninha libélula gafanhoto grilo besouro pulga cigarra cupim mariposa barata vaga-lume louva-a-deus percevejo piolho pernilongo marimbondo lagarta traça'),
    C('meubles', 'Móvel', 'móveis', 'objets', 'mesa cadeira armário cama sofá poltrona cômoda estante prateleira banqueta criado-mudo guarda-roupa escrivaninha aparador baú pufe divã cabideiro sapateira berço beliche penteadeira cristaleira biombo'),
    C('cuisine', 'Utensílio de cozinha', 'utensílios de cozinha', 'objets', 'panela frigideira concha batedor escorredor colher garfo tigela ralador peneira funil chaleira bule leiteira abridor saca-rolhas descascador assadeira travessa pegador pilão espremedor caldeirão'),
    C('outils', 'Ferramenta', 'ferramentas', 'objets', 'martelo serrote alicate furadeira pá ancinho machado enxada plaina formão talhadeira trena lixadeira picareta marreta torquês rastelo foice parafusadeira chave-inglesa cinzel broca prumo'),
    C('instruments', 'Instrumento musical', 'instrumentos musicais', 'objets', 'piano violino violão guitarra flauta trompete harpa tambor violoncelo saxofone clarinete sanfona oboé xilofone banjo contrabaixo cavaquinho pandeiro bandolim ukulele trombone tuba gaita berimbau atabaque cuíca zabumba viola'),
    C('vetements', 'Roupa', 'roupas', 'objets', 'camisa calça saia vestido casaco jaqueta meia cachecol colete bermuda macacão pijama camiseta terno blazer moletom blusa sobretudo agasalho maiô biquíni avental poncho cardigã'),
    C('arbres', 'Árvore', 'árvores', 'nature', 'carvalho pinheiro salgueiro cedro oliveira palmeira coqueiro cerejeira macieira nogueira acácia baobá sequoia ipê jacarandá jequitibá eucalipto figueira castanheira araucária pau-brasil seringueira goiabeira laranjeira limoeiro cajueiro cipreste abeto olmo'),
    C('fleurs', 'Flor', 'flores', 'nature', 'tulipa margarida papoula girassol lírio orquídea narciso lavanda peônia jasmim dália gerânio hortênsia gladíolo cravo camélia azaleia begônia petúnia crisântemo hibisco bromélia amor-perfeito copo-de-leite malmequer gardênia dente-de-leão'),
    C('meteo', 'Clima', 'palavras do clima', 'nature', 'chuva neve vento tempestade nuvem neblina granizo trovão geada arco-íris garoa chuvisco aguaceiro orvalho furacão tornado nevasca relâmpago trovoada brisa ventania nevoeiro ciclone vendaval'),
    C('metiers', 'Profissão', 'profissões', 'societe', 'padeiro médico bombeiro carteiro encanador cabeleireiro enfermeiro piloto cozinheiro jardineiro marceneiro dentista arquiteto eletricista policial veterinário jornalista garçom farmacêutico fazendeiro açougueiro professor advogado mecânico florista astronauta pedreiro motorista engenheiro carpinteiro'),
    C('sports', 'Esporte', 'esportes', 'societe', 'futebol rúgbi natação judô esqui golfe boxe esgrima ciclismo basquete vôlei handebol remo surfe caratê escalada atletismo badminton hipismo mergulho patinação hóquei beisebol ginástica boliche canoagem maratona triatlo'),
    C('transports', 'Meio de transporte', 'meios de transporte', 'societe', 'carro bicicleta trem avião barco ônibus caminhão metrô bonde moto patinete helicóptero táxi foguete veleiro navio trator submarino ambulância lancha canoa jangada carroça teleférico caiaque iate trenó charrete'),
    C('batiments', 'Construção', 'construções', 'societe', 'casa escola igreja castelo prefeitura hospital estação fábrica museu teatro estádio moinho cabana prédio garagem celeiro prisão cinema quartel biblioteca palácio catedral hotel armazém torre mercado padaria capela mansão galpão aeroporto'),
    C('famille', 'Família', 'membros da família', 'societe', 'pai mãe irmão irmã tio tia primo prima sobrinho sobrinha filho filha padrinho madrinha avô avó marido esposa genro nora neto neta sogro sogra cunhado cunhada'),
    C('corps', 'Corpo humano', 'partes do corpo', 'divers', 'braço perna mão pé cabeça joelho cotovelo ombro dedo nariz boca orelha olho tornozelo pulso pescoço costas barriga testa queixo bochecha calcanhar quadril unha lábio língua dente cintura umbigo peito'),
    C('pays', 'País', 'países', 'divers', 'Brasil França Espanha Itália Japão Canadá Marrocos China Índia México Egito Suécia Grécia Portugal Noruega Quênia Argentina Irlanda Austrália Alemanha Bélgica Suíça Chile Uruguai Paraguai Colômbia Rússia Angola Turquia Cuba'),
    C('couleurs', 'Cor', 'cores', 'divers', 'vermelho azul verde amarelo preto branco cinza roxo bege turquesa índigo púrpura escarlate ocre ciano magenta marrom carmim bordô castanho azul-marinho prateado'),
    C('epices', 'Tempero ou erva', 'temperos ou ervas', 'nourriture', 'baunilha açafrão cominho curry páprica noz-moscada gengibre cúrcuma tomilho manjericão salsinha cebolinha alecrim orégano estragão coentro endro sálvia cardamomo anis hortelã pimenta colorau manjerona cravo-da-índia erva-doce'),
    C('fromages', 'Queijo', 'queijos', 'nourriture', 'parmesão provolone gorgonzola cheddar gouda brie camembert ricota mascarpone emmental roquefort feta requeijão cottage burrata pecorino gruyère muçarela edam'),
    C('ecole', 'Material escolar', 'materiais escolares', 'objets', 'lápis caderno borracha caneta estojo mochila fichário marca-texto grampeador apontador régua giz calculadora cola agenda transferidor esquadro lapiseira canetinha clipe cartolina corretivo dicionário apagador'),
    C('jouets', 'Brinquedo', 'brinquedos', 'objets', 'boneca bola pião pelúcia quebra-cabeça ioiô pipa dominó marionete caleidoscópio bilboquê boneco carrinho robô peteca bambolê gangorra escorregador pula-pula massinha bumerangue estilingue fantoche soldadinho'),
    C('paysages', 'Paisagem', 'paisagens', 'nature', 'montanha colina vale planície falésia vulcão deserto floresta lago rio oceano ilha cachoeira duna cânion pântano praia gruta caverna golfo baía lagoa mangue cerrado geleira savana penhasco planalto chapada recife'),
    C('espace', 'Espaço', 'palavras do espaço', 'nature', 'planeta estrela cometa galáxia asteroide satélite nebulosa meteorito lua universo constelação eclipse órbita cratera Júpiter Saturno Vênus Netuno Urano Marte supernova cosmo'),
    C('formes', 'Forma', 'formas', 'divers', 'círculo quadrado triângulo retângulo losango oval trapézio hexágono pentágono octógono cubo esfera cilindro cone pirâmide paralelogramo semicírculo prisma elipse polígono cruz'),
    C('calendrier', 'Dia ou mês', 'dias ou meses', 'divers', 'domingo segunda-feira terça-feira quarta-feira quinta-feira sexta-feira sábado janeiro fevereiro março abril maio junho julho agosto setembro outubro novembro dezembro'),
    C('emotions', 'Emoção', 'emoções', 'divers', 'alegria tristeza raiva medo surpresa nojo orgulho vergonha ciúme tédio ternura gratidão nostalgia susto entusiasmo timidez saudade felicidade ansiedade inveja solidão euforia paixão angústia culpa pavor alívio esperança'),
  ],
  sentences: [
    // Palier 1 : des phrases courtes.
    [
      ['A neve é fria.', 'A neve é quente.'],
      ['O fogo é quente.', 'O fogo é gelado.'],
      ['Um gato tem quatro patas.', 'Um gato tem seis patas.'],
      ['Os pássaros têm penas.', 'Os pássaros têm escamas.'],
      ['O leite é branco.', 'O leite é verde.'],
      ['Uma semana tem sete dias.', 'Uma semana tem dez dias.'],
      ['Os peixes vivem na água.', 'Os peixes vivem nas árvores.'],
      ['O limão é azedo.', 'O limão é salgado.'],
      ['Um carro tem rodas.', 'Um carro tem asas.'],
      ['A grama é verde.', 'A grama é roxa.'],
      ['Dormimos numa cama.', 'Dormimos num forno.'],
      ['O mar é salgado.', 'O mar é doce.'],
      ['Um quadrado tem quatro lados.', 'Um quadrado tem três lados.'],
      ['As vacas dão leite.', 'As vacas dão lã.'],
      ['Um ano tem doze meses.', 'Um ano tem oito meses.'],
      ['Bebemos num copo.', 'Bebemos num garfo.'],
      ['O gelo derrete no sol.', 'O gelo endurece no sol.'],
      ['O cachorro late.', 'O cachorro mia.'],
      ['As abelhas fazem mel.', 'As abelhas fazem leite.'],
      ['Um triângulo tem três lados.', 'Um triângulo tem cinco lados.'],
      ['Lemos um livro.', 'Bebemos um livro.'],
      ['A maçã é uma fruta.', 'A maçã é uma ferramenta.'],
      ['O piano é um instrumento.', 'O piano é um animal.'],
      ['Lisboa fica em Portugal.', 'Lisboa fica na Espanha.'],
      ['Uma mão tem cinco dedos.', 'Uma mão tem sete dedos.'],
      ['Vemos com os olhos.', 'Vemos com as orelhas.'],
      ['Ouvimos com as orelhas.', 'Ouvimos com os joelhos.'],
      ['O gatinho é filhote de gato.', 'O pintinho é filhote de gato.'],
      ['O morango é vermelho.', 'O morango é preto.'],
      ['A ovelha tem lã.', 'A ovelha tem penas.'],
      ['Dois mais dois são quatro.', 'Dois mais dois são cinco.'],
      ['O trem anda nos trilhos.', 'O trem anda na água.'],
      ['A bicicleta tem duas rodas.', 'A bicicleta tem cinco rodas.'],
      ['O leão é um animal.', 'O leão é uma planta.'],
      ['A chuva molha.', 'A chuva seca.'],
      ['As árvores têm folhas.', 'As árvores têm dentes.'],
      ['Segunda vem depois de domingo.', 'Segunda vem depois de quarta.'],
      ['O açúcar é doce.', 'O açúcar é salgado.'],
      ['Escrevemos com caneta.', 'Escrevemos com colher.'],
      ['O pato sabe nadar.', 'O pato sabe tricotar.'],
    ],
    // Palier 2 : plus longues, avec des comparaisons.
    [
      ['Um elefante é bem mais pesado que um rato.', 'Um rato é bem mais pesado que um elefante.'],
      ['A água congela quando faz muito frio.', 'A água congela quando faz muito calor.'],
      ['Uma hora tem sessenta minutos.', 'Uma hora tem cem minutos.'],
      ['Os ursos-polares vivem em regiões frias.', 'Os ursos-polares vivem em desertos quentes.'],
      ['O sol nasce no leste.', 'O sol nasce no oeste.'],
      ['A girafa tem o pescoço muito comprido.', 'A girafa tem o pescoço muito curto.'],
      ['Fevereiro é o mês mais curto do ano.', 'Fevereiro é o mês mais longo do ano.'],
      ['Abrimos o guarda-chuva quando chove.', 'Abrimos o guarda-chuva para cortar pão.'],
      ['Uma dúzia de ovos tem doze ovos.', 'Uma dúzia de ovos tem vinte ovos.'],
      ['O coração bombeia o sangue pelo corpo.', 'O cabelo bombeia o sangue pelo corpo.'],
      ['Um quilômetro é maior que um metro.', 'Um metro é maior que um quilômetro.'],
      ['As lagartas viram borboletas.', 'As lagartas viram passarinhos.'],
      ['O pão é feito com farinha.', 'O pão é feito com areia.'],
      ['O Polo Norte é um lugar muito frio.', 'O Polo Norte é um lugar muito quente.'],
      ['A tartaruga anda mais devagar que a lebre.', 'A tartaruga corre mais rápido que o cavalo.'],
      ['O dentista cuida dos dentes.', 'O dentista conserta carros.'],
      ['As plantas precisam de luz para crescer.', 'As plantas crescem melhor no escuro total.'],
      ['Com leite, dá para fazer queijo.', 'Com suco de laranja, dá para fazer queijo.'],
      ['Um minuto tem sessenta segundos.', 'Um minuto tem dez segundos.'],
      ['O avião leva passageiros pelo ar.', 'O avião leva passageiros debaixo do mar.'],
      ['A Terra gira em torno do Sol.', 'O Sol gira em torno da Terra.'],
      ['O padeiro faz pão e bolos.', 'O padeiro conserta carros e caminhões.'],
      ['Os golfinhos sobem à superfície para respirar.', 'Os golfinhos nunca precisam respirar ar.'],
      ['O café da manhã é a primeira refeição do dia.', 'O jantar é a primeira refeição do dia.'],
      ['Uma rolha de cortiça boia na água.', 'Uma chave de ferro boia na água.'],
      ['A coruja caça principalmente à noite.', 'A coruja caça principalmente ao meio-dia.'],
      ['O número dez é maior que o número sete.', 'O número sete é maior que o número dez.'],
      ['O carteiro entrega cartas nas casas.', 'O carteiro entrega cartas nos rios.'],
      ['Os caracóis andam muito devagar.', 'Os caracóis andam mais rápido que um carro.'],
      ['Cozinhamos o macarrão em água fervendo.', 'Cozinhamos o macarrão em água gelada.'],
      ['A zebra tem listras pretas e brancas.', 'A zebra tem manchas vermelhas e verdes.'],
      ['O meio-dia fica no meio do dia.', 'A meia-noite fica no meio do dia.'],
      ['Uma orquestra toca música em conjunto.', 'Uma orquestra joga futebol em conjunto.'],
      ['A Lua gira em torno da Terra.', 'A Terra gira em torno da Lua.'],
      ['Um litro de água pesa cerca de um quilo.', 'Um litro de água pesa cerca de dez quilos.'],
      ['As nuvens trazem a chuva.', 'As montanhas trazem a chuva.'],
      ['Um século dura cem anos.', 'Um século dura dez anos.'],
      ['O bombeiro apaga incêndios.', 'O bombeiro começa incêndios.'],
      ['As aranhas têm oito patas.', 'As aranhas têm duas patas.'],
      ['O verão costuma ser mais quente que o inverno.', 'O inverno costuma ser mais quente que o verão.'],
    ],
    // Palier 3 : des négations et de petits raisonnements, à lire jusqu'au bout.
    [
      ['Um peixe não sobrevive muito tempo fora da água.', 'Um peixe nunca precisa de água para viver.'],
      ['Não é verdade que os gatos latem.', 'É verdade que os gatos latem.'],
      ['As cobras não têm patas.', 'As cobras têm quatro patas.'],
      ['Uma semana não tem oito dias.', 'Uma semana não tem sete dias.'],
      ['O gelo não é quente.', 'O gelo não é frio.'],
      ['Nem todos os cachorros são pretos.', 'Todos os cachorros, sem exceção, são pretos.'],
      ['Nenhum triângulo tem quatro lados.', 'Alguns triângulos têm quatro lados.'],
      ['Se todos os gatos são animais, então meu gato é um animal.', 'Se todos os gatos são animais, então todos os animais são gatos.'],
      ['É falso dizer que um quadrado tem cinco lados.', 'É falso dizer que um quadrado tem quatro lados.'],
      ['Nem todas as aves sabem voar.', 'Todas as aves, sem exceção, sabem voar.'],
      ['Nem o leão nem o tigre comem só capim.', 'O leão e o tigre comem só capim.'],
      ['Um minuto não é mais longo que uma hora.', 'Uma hora não é mais longa que um minuto.'],
      ['Sem água, as plantas acabam murchando.', 'Sem água, as plantas crescem mais rápido.'],
      ['Ninguém respira debaixo d’água sem equipamento.', 'Todo mundo respira debaixo d’água sem equipamento.'],
      ['Nenhum mês do ano tem quarenta dias.', 'Pelo menos um mês do ano tem quarenta dias.'],
      ['Não é com os pés que costumamos escrever.', 'Não é com as mãos que costumamos escrever.'],
      ['Um número par nunca é ímpar.', 'Um número par às vezes é ímpar.'],
      ['Não é impossível ver a Lua durante o dia.', 'É impossível ver a Lua durante o dia.'],
      ['Sete não é um número par.', 'Oito não é um número par.'],
      ['Logo antes de terça vem segunda, e não quarta.', 'Logo antes de terça vem quarta, e não segunda.'],
      ['Uma formiga não é maior que um cachorro.', 'Um cachorro não é maior que uma formiga.'],
      ['O contrário de “subir” não é “escalar”.', 'O contrário de “subir” não é “descer”.'],
      ['A palavra “gato” não tem a letra E.', 'A palavra “gato” não tem a letra A.'],
      ['Dez menos três não dá oito.', 'Dez menos três não dá sete.'],
      ['Se Paulo é mais alto que Ana, e eu mais alto que Paulo, sou mais alto que Ana.', 'Se Paulo é mais alto que Ana, e eu mais alto que Paulo, Ana é mais alta que eu.'],
      ['Nem todas as rosas são vermelhas.', 'Todas as rosas, sem exceção, são vermelhas.'],
      ['Um filho nunca é mais velho que os pais.', 'Um filho é sempre mais velho que os pais.'],
      ['O despertador não serve para dormir, mas para acordar.', 'O despertador serve para dormir, e não para acordar.'],
      ['A palavra “sol” não começa com a letra L.', 'A palavra “sol” não começa com a letra S.'],
      ['Não nascem maçãs num pinheiro.', 'Os pinheiros dão maçãs.'],
      ['Um número maior que dez nunca é menor que cinco.', 'Um número maior que dez às vezes é menor que cinco.'],
      ['Amarelo misturado com vermelho não dá azul.', 'Amarelo misturado com vermelho não dá laranja.'],
      ['Depois de quinta não vem sábado, mas sexta.', 'Depois de quinta não vem sexta, mas sábado.'],
      ['Um cubo não tem nenhuma face redonda.', 'Um cubo não tem nenhuma face quadrada.'],
      ['Uma metade não é menor que um quarto.', 'Um quarto não é menor que uma metade.'],
      ['O dobro de quatro não é seis.', 'O dobro de quatro não é oito.'],
      ['Se amanhã é sábado, então hoje não é segunda.', 'Se amanhã é sábado, então hoje é segunda.'],
      ['Um mês não tem mais dias que um ano.', 'Um mês tem mais dias que um ano.'],
      ['Quando gela, a água do lago não fica mais quente.', 'Quando gela, a água do lago fica fervendo.'],
      ['Não é a vaca que bota ovos, mas a galinha.', 'Não é a galinha que bota ovos, mas a vaca.'],
    ],
    // Palier 4 : des phrases à rallonge, l'erreur peut se cacher tout au bout.
    [
      ['O gato dorme muito durante o dia e enxerga melhor do que nós na penumbra.', 'O gato dorme muito durante o dia e enxerga pior do que nós na penumbra.'],
      ['O sol nasce no leste, fica no ponto mais alto perto do meio-dia e se põe no oeste.', 'O sol nasce no leste, fica no ponto mais alto perto do meio-dia e se põe no leste.'],
      ['Um ano tem doze meses, e a maioria dos meses tem trinta ou trinta e um dias.', 'Um ano tem doze meses, e a maioria dos meses tem vinte ou vinte e um dias.'],
      ['Para fazer uma omelete, quebramos os ovos, batemos e depois cozinhamos numa frigideira.', 'Para fazer uma omelete, quebramos os ovos, batemos e depois cozinhamos no congelador.'],
      ['As abelhas voam de flor em flor levando pólen, o que ajuda as plantas a dar frutos.', 'As abelhas voam de flor em flor levando pólen, o que impede as plantas de dar frutos.'],
      ['Quando misturamos azul e amarelo, obtemos verde, a cor da grama na primavera.', 'Quando misturamos azul e amarelo, obtemos vermelho, a cor dos tomates bem maduros.'],
      ['A baleia vive no mar, mas precisa subir à superfície para respirar.', 'A baleia vive no mar e respira debaixo d’água com guelras, como os peixes.'],
      ['No Brasil, o inverno começa em junho e o verão começa em dezembro.', 'No Brasil, o inverno começa em junho e o verão começa em março.'],
      ['O pão é feito de farinha, água, sal e fermento, e depois vai assar no forno.', 'O pão é feito de farinha, água, sal e fermento, e depois vai assar na geladeira.'],
      ['No relógio, o ponteiro pequeno mostra as horas e o ponteiro grande mostra os minutos.', 'No relógio, o ponteiro grande mostra as horas e o ponteiro pequeno mostra os minutos.'],
      ['Para atravessar a rua, esperamos o bonequinho ficar verde e olhamos para os dois lados.', 'Para atravessar a rua, esperamos o bonequinho ficar vermelho e atravessamos sem olhar.'],
      ['Os sapos nascem como girinos, que vivem na água antes de perder a cauda.', 'Os sapos nascem como girinos, que vivem na água antes de se cobrir de penas.'],
      ['Com o leite da vaca, fazemos manteiga, creme, iogurte e muitos tipos de queijo.', 'Com o leite da vaca, fazemos manteiga, creme, iogurte e muitos tipos de geleia.'],
      ['O mês de dezembro termina no dia 31, e no dia seguinte começa o mês de janeiro.', 'O mês de dezembro termina no dia 31, e no dia seguinte começa o mês de fevereiro.'],
      ['Os dentes de leite caem na infância e dão lugar aos dentes permanentes.', 'Os dentes permanentes caem na infância e dão lugar aos dentes de leite.'],
      ['O termômetro mede a temperatura, e a balança mostra quanto pesa um objeto.', 'O termômetro mede a temperatura, e a balança mostra que horas são.'],
      ['Ao nível do mar, a água ferve a cem graus e congela a zero grau.', 'Ao nível do mar, a água ferve a cem graus e congela a cinquenta graus.'],
      ['Quando é noite no Brasil, muitas vezes é dia do outro lado da Terra.', 'Quando é noite no Brasil, também é noite em todos os outros lugares da Terra.'],
      ['O coração bate mais rápido quando corremos e mais devagar quando descansamos.', 'O coração bate mais rápido quando descansamos e mais devagar quando corremos.'],
      ['O arco-íris costuma aparecer quando o sol brilha enquanto ainda está chovendo.', 'O arco-íris costuma aparecer no meio da noite, quando não há sol nem chuva.'],
      ['A Lua brilha à noite porque reflete a luz do Sol, como um espelho distante.', 'A Lua brilha à noite porque produz a própria luz, como se fosse uma lâmpada.'],
      ['A Amazônia é uma floresta enorme, cortada por muitos rios, no norte do Brasil.', 'A Amazônia é uma floresta enorme, cortada por muitos rios, no sul da Argentina.'],
      ['Muitos morcegos dormem de dia, de cabeça para baixo, e caçam insetos à noite.', 'Muitos morcegos dormem à noite, de cabeça para baixo, e caçam insetos ao meio-dia.'],
      ['Um quilo de penas pesa tanto quanto um quilo de chumbo, mesmo ocupando muito mais espaço.', 'Um quilo de penas pesa bem menos que um quilo de chumbo, porque as penas são leves.'],
      ['Um triângulo tem três lados, um quadrado tem quatro, e um hexágono tem seis.', 'Um triângulo tem três lados, um quadrado tem quatro, e um hexágono tem oito.'],
      ['As plantas verdes precisam de luz, água e ar para produzir o próprio alimento.', 'As plantas verdes precisam de luz, água e açúcar refinado para produzir o próprio alimento.'],
      ['Num baralho comum, há naipes de copas, ouros, paus e espadas.', 'Num baralho comum, há naipes de copas, ouros, paus e estrelas.'],
      ['Os caracóis carregam a concha nas costas e deixam um rastro brilhante por onde passam.', 'Os caracóis carregam a concha nas costas e deixam pegadas de patas por onde passam.'],
      ['O piano tem teclas brancas e teclas pretas, e tocamos com os dedos.', 'O piano tem teclas brancas e teclas pretas, e tocamos soprando dentro dele.'],
      ['O oceano Atlântico separa o Brasil da África, e um avião o atravessa em poucas horas.', 'O oceano Atlântico separa o Brasil da África, e dá para atravessá-lo a pé em poucas horas.'],
      ['Quando temos febre, a temperatura do corpo sobe acima do normal.', 'Quando temos febre, a temperatura do corpo desce bem abaixo do normal.'],
      ['Os filhotes de canguru crescem vários meses dentro da bolsa da mãe.', 'Os filhotes de canguru crescem vários meses num ninho, no alto das árvores.'],
      ['O dicionário organiza as palavras em ordem alfabética, da letra A até a letra Z.', 'O dicionário organiza as palavras em ordem alfabética, da letra Z até a letra A.'],
      ['No futebol, só o goleiro pode pegar a bola com as mãos durante o jogo.', 'No futebol, todos os jogadores podem pegar a bola com as mãos durante o jogo.'],
      ['O rio Amazonas é um rio enorme da América do Sul que deságua no oceano Atlântico.', 'O rio Amazonas é um rio enorme da América do Sul que deságua no oceano Pacífico.'],
      ['Quando a tartaruga sente medo, ela costuma recolher a cabeça e as patas dentro do casco.', 'Quando a tartaruga sente medo, ela sai do casco e o deixa para trás para correr mais rápido.'],
      ['O carro elétrico é recarregado ligando-o numa tomada, mais ou menos como um celular.', 'O carro elétrico é recarregado enchendo o tanque de água, mais ou menos como um regador.'],
      ['A girafa é o animal terrestre mais alto, e come as folhas do alto das árvores.', 'A girafa é o animal terrestre mais alto, e come os peixes do fundo dos rios.'],
      ['A primavera vem depois do inverno, e depois vêm o verão e o outono, antes de um novo inverno.', 'A primavera vem depois do verão, e depois vêm o inverno e o outono, antes de um novo verão.'],
      ['A ampulheta mede o tempo com a areia que escorre devagar de cima para baixo.', 'A ampulheta mede o tempo com a areia que sobe devagar de baixo para cima.'],
    ],
    // Palier 5 : de la logique (« nenhum », « pelo menos », « se… então », doubles négations, petits calculs).
    [
      ['Se todas as aves têm penas e o sabiá é uma ave, então o sabiá tem penas.', 'Se todas as aves têm penas e o gato não é uma ave, então o gato tem penas.'],
      ['Não é falso dizer que dois mais dois são quatro.', 'Não é falso dizer que dois mais dois são cinco.'],
      ['Nenhum mês do ano tem menos de vinte e oito dias.', 'Pelo menos um mês do ano tem menos de vinte e oito dias.'],
      ['Se Lia nasceu antes de Tom, então Tom não é mais velho que Lia.', 'Se Lia nasceu antes de Tom, então Tom é mais velho que Lia.'],
      ['Nunca é meio-dia e meia-noite ao mesmo tempo no mesmo lugar.', 'Às vezes é meio-dia e meia-noite ao mesmo tempo no mesmo lugar.'],
      ['Todo quadrado é um retângulo, mas nem todo retângulo é um quadrado.', 'Todo retângulo é um quadrado, mas nem todo quadrado é um retângulo.'],
      ['Se hoje é quarta, então depois de amanhã será sexta.', 'Se hoje é quarta, então depois de amanhã será sábado.'],
      ['Se ontem foi domingo, então amanhã será terça.', 'Se ontem foi domingo, então amanhã será segunda.'],
      ['Três vezes quatro dá doze, que é mais que dez.', 'Três vezes quatro dá doze, que é menos que dez.'],
      ['A metade de vinte é dez, e o dobro de dez é vinte.', 'A metade de vinte é dez, e o dobro de dez é trinta.'],
      ['Se Rui tem mais bolinhas que Bia e Bia mais que Léo, então Léo tem menos que Rui.', 'Se Rui tem mais bolinhas que Bia e Bia mais que Léo, então Léo tem mais que Rui.'],
      ['A palavra “banana” tem a letra A três vezes.', 'A palavra “banana” tem a letra A duas vezes.'],
      ['A palavra “ovo” se lê igual da esquerda para a direita e da direita para a esquerda.', 'A palavra “uva” se lê igual da esquerda para a direita e da direita para a esquerda.'],
      ['Não é verdade que nenhum animal vive no mar.', 'É verdade que nenhum animal vive no mar.'],
      ['Nem os gatos nem os cachorros botam ovos.', 'Tanto os gatos quanto os cachorros botam ovos, como as galinhas.'],
      ['Só os números pares se dividem por dois sem resto, e o sete não é um deles.', 'Só os números pares se dividem por dois sem resto, e o nove é um deles.'],
      ['Se tiramos uma maçã de um cesto com cinco maçãs, sobram quatro.', 'Se tiramos uma maçã de um cesto com cinco maçãs, sobram seis.'],
      ['Um mês de trinta e um dias dura mais que quatro semanas.', 'Um mês de trinta e um dias dura menos que quatro semanas.'],
      ['Um século dura mais que dez anos, mas menos que mil anos.', 'Um século dura mais que mil anos, mas menos que dez anos.'],
      ['Se todas as portas estão fechadas, então nenhuma porta está aberta.', 'Se todas as portas estão fechadas, então pelo menos uma porta está aberta.'],
      ['É falso que o Sol gira em torno da Lua.', 'É verdade que o Sol gira em torno da Lua.'],
      ['Doze é ao mesmo tempo maior que dez e menor que quinze.', 'Doze é ao mesmo tempo maior que quinze e menor que dez.'],
      ['Se um cachorro é mais pesado que um gato, esse gato não é mais pesado que o cachorro.', 'Se um cachorro é mais pesado que um gato, esse gato é mais pesado que o cachorro.'],
      ['Uma segunda-feira nunca vem logo depois de uma terça-feira.', 'Às vezes uma segunda-feira vem logo depois de uma terça-feira.'],
      ['Ninguém pode ser ao mesmo tempo mais alto e mais baixo que a mesma pessoa.', 'Algumas pessoas são ao mesmo tempo mais altas e mais baixas que a mesma pessoa.'],
      ['Se Ana chega antes de João e João antes de Rita, então Rita não chega em primeiro.', 'Se Ana chega antes de João e João antes de Rita, então Rita chega em primeiro.'],
      ['Não é raro ver relâmpagos durante uma tempestade.', 'É impossível ver relâmpagos durante uma tempestade.'],
      ['Um animal que voa não é necessariamente uma ave, como mostra a abelha.', 'Um animal que voa é necessariamente uma ave, até a abelha.'],
      ['Dez menos quatro dá seis, e seis mais quatro volta a dar dez.', 'Dez menos quatro dá seis, e seis mais quatro dá doze.'],
      ['Na palavra “bombom”, a letra O aparece duas vezes.', 'Na palavra “bombom”, a letra O aparece três vezes.'],
      ['Quando o sinal está vermelho, os carros devem parar, e não acelerar.', 'Quando o sinal está vermelho, os carros devem acelerar, e não parar.'],
      ['Fevereiro tem menos dias que março, mesmo nos anos bissextos.', 'Fevereiro tem mais dias que março, exceto nos anos bissextos.'],
      ['Um número que termina em zero sempre se divide por dez.', 'Um número que termina em cinco sempre se divide por dez.'],
      ['Quando o ponteiro grande do relógio dá uma volta completa, passa uma hora.', 'Quando o ponteiro grande do relógio dá uma volta completa, passa um minuto.'],
      ['Se todas as bolinhas do saco são vermelhas, a que eu tirar será vermelha.', 'Se todas as bolinhas do saco são vermelhas, a que eu tirar pode ser azul.'],
      ['Quatro é a metade de oito, e oito é o dobro de quatro.', 'Quatro é o dobro de oito, e oito é a metade de quatro.'],
      ['Nenhum dia da semana começa com a letra Z.', 'Um dos dias da semana começa com a letra Z.'],
      ['Se saio às oito e a viagem dura duas horas, chego às dez.', 'Se saio às oito e a viagem dura duas horas, chego às onze.'],
      ['Quinze minutos são um quarto de hora, e trinta minutos, meia hora.', 'Quinze minutos são meia hora, e trinta minutos, um quarto de hora.'],
      ['Um objeto mais comprido que um metro é também mais comprido que um centímetro.', 'Um objeto mais comprido que um centímetro é também mais comprido que um metro.'],
    ],
  ],
  quiNames: [
    'Lucas', 'Laura', 'Lara', 'Luana', 'Lívia', 'Léo', 'Luiza', 'Lorena',
    'Maria', 'Miguel', 'Mateus', 'Mariana', 'Manuela', 'Marcos', 'Maitê', 'Murilo',
    'João', 'Júlia', 'Joana', 'Jorge', 'José', 'Juliana',
    'Ana', 'Alice', 'Arthur', 'Amanda', 'André', 'Aline',
    'Bruno', 'Beatriz', 'Bianca', 'Bernardo', 'Bruna',
    'Gabriel', 'Gustavo', 'Giovana', 'Gael', 'Gabriela',
    'Rafael', 'Rodrigo', 'Renata', 'Ricardo', 'Rebeca',
    'Sofia', 'Samuel', 'Sara', 'Sérgio', 'Sílvia',
    'Carla', 'Caio', 'Carlos', 'Camila', 'Cecília', 'Clara',
    'Pedro', 'Paulo', 'Paula', 'Pietra',
    'Davi', 'Daniel', 'Diego', 'Débora',
    'Eduardo', 'Elisa', 'Enzo', 'Emanuel',
    'Felipe', 'Fernanda', 'Fábio', 'Flávia',
    'Helena', 'Heitor', 'Hugo', 'Isabela', 'Igor', 'Isadora', 'Ivan',
    'Nicolas', 'Natália', 'Nina', 'Otávio', 'Olívia', 'Tiago', 'Tomás', 'Teresa', 'Vítor', 'Vanessa', 'Valéria',
  ],
  // Le conseil n° i adapte le conseil français n° i.
  coachTips: [
    'Cinco minutos todos os dias valem mais que uma hora no domingo: a regularidade conta mais que a duração.',
    'O sono ajuda a fixar o que você aprendeu durante o dia. Uma boa noite também é treino.',
    'Caminhar vinte minutos faz bem para as pernas… e para a cabeça.',
    'Para lembrar uma lista, invente uma pequena história que ligue os itens entre si.',
    'Um número de telefone se guarda melhor em blocos: 11 98765 4321 em vez de 11987654321.',
    'Aprender algo novo (uma receita, um idioma, um instrumento) exercita a mente de um jeito diferente dos hábitos.',
    'Um copo de água antes de jogar? Estar bem hidratado ajuda a manter a concentração.',
    'Travou num problema? Uma pausa curta muitas vezes ajuda a enxergar com mais clareza.',
    'Ler dez minutos por dia enriquece o vocabulário, sem você nem perceber.',
    'O cérebro adora novidades: mude o caminho quando for fazer compras.',
    'Cálculo mental: arredonde e depois corrija. 49 × 3 é 50 × 3 − 3, ou seja, 147.',
    'Três respirações lentas antes de começar ajudam a firmar a atenção.',
    'Uma coisa de cada vez: fazer várias tarefas ao mesmo tempo cansa mais do que parece.',
    'Conversar com os amigos é um exercício completo: ouvir, entender, responder.',
    'Os jogos de tabuleiro misturam memória, lógica e atenção… e ainda rendem boas risadas.',
    'Para lembrar o nome de alguém, repita-o na conversa assim que ouvir.',
    'Uma partida ruim é só uma partida: o humor e o cansaço pesam muito nas pontuações.',
    'Em repouso, o cérebro sozinho consome cerca de um quinto da energia do corpo.',
    'Variar os exercícios é mais divertido, e mais completo, do que repetir sempre o mesmo.',
    'Escrever à mão muitas vezes ajuda a memorizar melhor do que digitar.',
    'Para memorizar, testar a si mesmo funciona melhor do que reler. É exatamente o que você está fazendo aqui!',
    'Espaçar as revisões no tempo ajuda a lembrar por mais tempo do que estudar tudo na última hora.',
    'Explicar algo para outra pessoa é um ótimo jeito de entender bem.',
    'Cantar ou tocar música mobiliza ao mesmo tempo a memória, a atenção e a coordenação.',
    'Alguns minutos longe das telas, de vez em quando, descansam os olhos e a atenção.',
    'Dá para aprender em qualquer idade: a curiosidade não tem prazo de validade.',
    'Visualizar um trajeto em detalhes, rua por rua, treina a memória dos lugares.',
    'Rir relaxa e renova a atenção. Errar no jogo é permitido, e às vezes até engraçado.',
    'Fazer uma lista libera a memória para pensar em outra coisa.',
    'Uma sequência de dias seguidos motiva: até uma única partida basta para manter a chama acesa.',
    'Cores traiçoeiras: fixe o centro da palavra e se concentre na cor dela, não nas letras.',
    'Tabela de Schulte: mantenha os olhos no centro da grade e deixe a visão periférica procurar.',
    'Matriz: imagine a forma que a sequência desenha, como uma constelação.',
    'Olhar para trás: repita baixinho as últimas letras, como uma musiquinha.',
    'Total acumulado: guarde na cabeça só o total, nunca a lista de números.',
    'Anagramas: procure primeiro os grupos de letras comuns (CH, LH, NH, QU…).',
    'Cálculo relâmpago: para multiplicar por 9, multiplique por 10 e subtraia o número.',
    'A loja: conte o que entra e o que sai separadamente, depois faça a diferença.',
    'Pares: vire primeiro as cartas que você nunca viu.',
    'Palavras na memória: associe cada palavra a uma imagem meio maluca, e ela vai ficar.',
    'Mini sudoku: comece pela linha, coluna ou bloco mais preenchido.',
    'Rotação mental: repare num pequeno detalhe da forma e acompanhe-o enquanto ela gira.',
    'Balança: organize os objetos numa linha imaginária, do mais leve ao mais pesado.',
    'Relógios: conte primeiro as horas cheias, depois some os minutos.',
    'Setas: olhe só para a do meio, as vizinhas estão ali para distrair você.',
    'Reflexo: sem pressa! Um alarme falso custa mais caro que um pequeno atraso.',
    'Chuva de contas: comece sempre pela gota mais baixa.',
    'Cálculo diabólico: guarde na cabeça o resultado, não a conta.',
    'Troco: some primeiro as notas, da maior para a menor, depois as moedas.',
    'As emoções positivas ajudam a memorizar: divirta-se, é para isso que serve!',
  ],
  contraires: [
    // Adjectifs. La température.
    adj('quente/frio', 'escaldante/gelado quente=escaldante frio=gelado', 'tórrido/gélido tórrido=abrasador gélido=glacial'),
    // La taille et le poids (ni « grosso » ni « fino », qui disent aussi le caractère ; ni « mole/duro » : « duro » dit aussi « difícil »).
    adj(
      'grande/pequeno alto/baixo comprido/curto pesado/leve gordo/magro grande=enorme pequeno=minúsculo',
      'enorme/minúsculo largo/estreito espesso/delgado largo=amplo',
      'colossal/ínfimo espaçoso/apertado vasto/exíguo colossal=gigantesco minúsculo=ínfimo vasto=imenso',
    ),
    // La vitesse et l'heure.
    adj('rápido/lento', 'veloz/vagaroso precoce/tardio rápido=veloz lento=vagaroso', 'célere/moroso ágil=veloz moroso=vagaroso'),
    // L’âge et la nouveauté (« novo » veut dire aussi « jeune »).
    adj('jovem/velho novo/velho novo/usado', 'moderno/antiquado recente/antigo velho=idoso', 'arcaico/inovador obsoleto=antiquado jovem=juvenil'),
    // L'eau.
    adj('seco/molhado molhado=encharcado', 'úmido/seco', 'árido/fértil árido=ressecado'),
    // La propreté.
    adj('limpo/sujo', 'sujo=imundo limpo=asseado', 'imaculado/encardido imaculado=impecável'),
    // Plein ou vide, libre ou occupé (« um lugar livre », « um lugar vazio » : une seule famille).
    adj('cheio/vazio livre/ocupado', 'lotado/deserto livre/preso cheio=repleto', 'lotado=abarrotado repleto=pleno preso=cativo'),
    // Le calme et le courage (sans « silencioso » : « alto » et « baixo » disent aussi le volume).
    adj(
      'calmo/agitado corajoso/medroso paciente/impaciente calmo=tranquilo',
      'relaxado/nervoso valente/covarde corajoso=valente medroso=receoso calmo=sossegado',
      'sereno/ansioso destemido/temeroso audacioso=destemido intrépido=destemido sereno=plácido temeroso=receoso',
    ),
    // L'humeur.
    adj('feliz/triste alegre/triste contente/descontente feliz=alegre', 'risonho/tristonho feliz=contente', 'eufórico/abatido jovial=alegre melancólico=triste tristonho=triste'),
    // Le caractère, la modestie et l’argent (« humilde » veut dire aussi « pauvre »).
    adj(
      'bondoso/malvado educado/mal-educado rico/pobre caro/barato',
      'simpático/antipático generoso/avarento gentil/grosseiro modesto/vaidoso educado=gentil rico=endinheirado pobre=necessitado caro=custoso modesto=humilde',
      'benevolente/malévolo cortês/indelicado opulento/miserável pródigo/avarento módico/exorbitante humilde/arrogante educado=cortês avarento=sovina custoso=dispendioso módico=barato arrogante=prepotente vaidoso=presunçoso malvado=perverso',
    ),
    // L'intelligence et le savoir.
    adj('inteligente/burro sábio/ignorante', 'esperto=inteligente burro=estúpido sábio=instruído', 'perspicaz/obtuso erudito/inculto sagaz=perspicaz inculto=ignorante'),
    // La force.
    adj('forte/fraco resistente/frágil', 'forte=poderoso resistente=robusto', 'vigoroso/débil franzino=débil vigoroso=robusto'),
    // La difficulté.
    adj('fácil/difícil', 'difícil=complicado complicado=complexo', 'elementar/complexo difícil=árduo penoso=árduo'),
    // Le vrai, le faux et la franchise.
    adj(
      'verdadeiro/falso honesto/desonesto',
      'certo/errado sincero/hipócrita certo=correto franco=sincero',
      'verídico/mentiroso autêntico/falsificado leal/traiçoeiro íntegro/corrupto enganoso=falso',
    ),
    adj('aceso/apagado'),
    adj('presente/ausente'),
    adj('aberto/fechado'),
    // La distance.
    adj('próximo/distante', 'próximo=vizinho distante=afastado', 'longínquo=distante'),
    // La place et l'ordre.
    adj('primeiro/último interno/externo', 'inicial/final primeiro=inicial último=final', 'anterior/posterior'),
    // Le goût.
    adj('doce/salgado', 'saboroso/insosso delicioso=saboroso', 'suculento/insípido apetitoso/repugnante insosso=insípido'),
    // Le danger et la santé.
    adj('seguro/perigoso', 'perigoso/inofensivo saudável/doente perigoso=arriscado doente=enfermo', 'nocivo/inócuo salubre/insalubre nocivo=prejudicial'),
    // Le soin et le rangement.
    adj('arrumado/bagunçado cuidadoso/descuidado', 'organizado/desorganizado arrumado=organizado descuidado=desleixado', 'meticuloso=cuidadoso metódico=organizado relapso=desleixado'),
    // L'utilité et l'importance.
    adj(
      'útil/inútil',
      'essencial/secundário importante/insignificante necessário=indispensável importante=essencial',
      'supérfluo/indispensável inútil=supérfluo primordial=essencial',
    ),
    // Le possible et le probable.
    adj('possível/impossível', 'provável/improvável possível=viável impossível=inviável', 'plausível/inverossímil plausível=verossímil incontestável=indiscutível'),
    // La beauté.
    adj('bonito/feio bonito=lindo', 'belo/horrível bonito=belo', 'esplêndido/hediondo lindo=deslumbrante horrível=medonho'),
    // Le travail.
    adj('trabalhador/preguiçoso', 'ativo/passivo esforçado=trabalhador', 'indolente/diligente diligente=esforçado ocioso=indolente'),
    // L'habituel, le rare et le pareil.
    adj(
      'normal/estranho igual/diferente',
      'frequente/raro comum/incomum semelhante/diferente estranho=esquisito idêntico=igual',
      'abundante/escasso insólito=estranho abundante=copioso análogo=semelhante',
    ),
    // Ce qui se voit.
    adj('visível/invisível', 'discreto/chamativo', 'ostensivo=chamativo espalhafatoso=chamativo'),
    // La loi.
    adj('permitido/proibido', 'autorizado/vetado proibido=vetado permitido=autorizado', 'lícito/ilícito proibido=interdito'),
    // La douceur et la souplesse, au toucher et dans le caractère.
    adj('macio/áspero', 'liso/áspero flexível/rígido severo/indulgente flexível=maleável severo=rigoroso', 'rugoso=áspero macio=aveludado indulgente=clemente'),
    adj('', 'horizontal/vertical'),
    // L'obéissance.
    adj('obediente/desobediente', 'dócil/rebelde obediente=dócil', 'rebelde=insubmisso'),
    adj('vivo/morto'),
    adj('claro/escuro', 'escuro=sombrio', 'luminoso/tenebroso claro=luminoso'),
    adj('cru/cozido'),
    adj('positivo/negativo'),
    adj('', 'par/ímpar'),
    adj('famoso/anônimo', 'famoso=célebre', 'ilustre=célebre'),
    adj('', '', 'afiado/rombudo afiado=amolado'),

    // Verbes. Monter, grandir, avancer, aller vite (« os preços sobem »).
    verbe(
      'subir/descer levantar/abaixar aumentar/diminuir avançar/recuar',
      'alongar/encurtar ampliar/reduzir acelerar/frear progredir/regredir diminuir=reduzir aumentar=ampliar',
      'escalar=subir dilatar/contrair amplificar/atenuar apressar/retardar acelerar=apressar',
    ),
    // Entrer, partir, apparaître (pas « partir » : il veut dire aussi « casser »).
    verbe('entrar/sair chegar/ir_embora aparecer/desaparecer ir/vir', 'surgir=aparecer sumir=desaparecer', 'emigrar/imigrar emergir=surgir'),
    verbe('abrir/fechar'),
    verbe('acender/apagar'),
    // Gagner et perdre.
    verbe('ganhar/perder achar/perder', 'ganhar=vencer encontrar=achar conseguir/fracassar', 'triunfar=vencer fracassar=malograr'),
    // Donner, accepter, acheter, avouer.
    verbe(
      'dar/receber aceitar/recusar comprar/vender',
      'admitir/negar afirmar/negar recusar=rejeitar',
      'confirmar/desmentir conceder=outorgar recusar=declinar adquirir=comprar negar=desmentir',
    ),
    verbe('atacar/defender', 'defender=proteger atacar=agredir', 'acometer=atacar resguardar=proteger'),
    // Commencer et finir.
    verbe('começar/terminar começar=iniciar', 'iniciar/acabar terminar=acabar', 'principiar=começar concluir=terminar encetar=começar'),
    verbe('construir/destruir', 'edificar=construir destruir=demolir', 'aniquilar=destruir arrasar=demolir'),
    verbe('encher/esvaziar', '', 'abarrotar=encher'),
    verbe('amar/odiar amar=adorar', 'gostar/detestar detestar=odiar', 'estimar/desprezar idolatrar=adorar abominar=detestar'),
    verbe('rir/chorar', '', 'chorar=prantear'),
    // La voix.
    verbe('falar/calar gritar=berrar', 'sussurrar/gritar', 'murmurar/vociferar murmurar=sussurrar vociferar=berrar'),
    // Lier et séparer, rapprocher et éloigner.
    verbe(
      'amarrar/desamarrar juntar/separar',
      'unir/dividir montar/desmontar aproximar/afastar amarrar=atar juntar=unir',
      'agrupar/dispersar distanciar=afastar separar=apartar',
    ),
    verbe('esquecer/lembrar', 'lembrar=recordar', 'olvidar=esquecer'),
    verbe('esconder/mostrar', 'revelar/esconder esconder=ocultar', 'desvendar/dissimular revelar=desvendar'),
    verbe('viver/morrer', 'nascer/morrer', 'morrer=falecer morrer=perecer'),
    verbe('', 'aquecer/esfriar congelar/derreter'),
    verbe('', 'molhar/secar molhar=encharcar', 'umedecer=molhar'),
    verbe('obedecer/desobedecer', '', 'acatar=obedecer'),
    verbe('', 'acalmar/irritar acalmar=tranquilizar', 'apaziguar/exasperar irritar=enfurecer'),
    verbe('encorajar/desencorajar', 'encorajar=incentivar', 'instigar/dissuadir instigar=incitar'),
    verbe('', 'elogiar/criticar criticar=censurar', 'enaltecer/difamar difamar=denegrir'),
    verbe('', 'gastar/economizar desperdiçar/poupar', 'desperdiçar=esbanjar economizar=poupar'),
    verbe('empurrar/puxar'),
    verbe('pôr/tirar', 'acrescentar/retirar tirar=retirar', 'adicionar=acrescentar suprimir=eliminar retirar=remover'),
    verbe('perguntar/responder'),
    verbe('dormir/acordar'),
    verbe('aprender/ensinar'),
    verbe('trabalhar/descansar', 'descansar=repousar'),

    // Noms. Le temps.
    nom('dia/noite verão/inverno começo/fim', 'passado/futuro começo=início', 'aurora/crepúsculo prólogo/epílogo aurora=alvorada'),
    // Les gens.
    nom('amigo/inimigo criança/adulto herói/vilão', 'aliado/adversário juventude/velhice inimigo=adversário amigo=companheiro', 'rival=adversário juventude=mocidade'),
    // La guerre, la paix et le bruit (« paz e silêncio »).
    nom('guerra/paz silêncio/barulho', 'harmonia/discórdia guerra=conflito briga=desavença barulho=ruído', 'concórdia/discórdia barulho=algazarra'),
    // Les émotions.
    nom('alegria/tristeza amor/ódio felicidade/infelicidade', 'prazer/dor alegria=contentamento tristeza=mágoa dor=sofrimento', 'júbilo=alegria desgosto=mágoa'),
    // Le courage et la force.
    nom('', 'coragem/covardia força/fraqueza medo=receio força=vigor', 'bravura=coragem pavor=terror'),
    nom('luz/sombra', 'luz/escuridão claridade=luz', 'escuridão=trevas'),
    // La richesse, le manque, la victoire, l’avantage (« prejuízo » et « desvantagem » se touchent).
    nom(
      'vitória/derrota vencedor/perdedor',
      'riqueza/pobreza abundância/escassez lucro/prejuízo vantagem/desvantagem sucesso/fracasso pobreza=miséria falta=escassez riqueza=fortuna vitória=triunfo',
      'opulência/indigência fartura/carestia lucro=ganho derrota=revés trunfo=vantagem',
    ),
    nom('verdade/mentira'),
    nom('pergunta/resposta'),
    nom('partida/chegada entrada/saída'),
    // Ce qui monte et ce qui descend.
    nom('', 'subida/descida aumento/diminuição', 'apogeu/declínio cume=cimo'),
    nom('trabalho/descanso', 'descanso=repouso', 'labuta=trabalho'),
    nom('qualidade/defeito', 'virtude/vício', 'defeito=imperfeição'),
    nom('ordem/desordem', 'desordem=bagunça', 'desordem=caos'),
    nom('cidade/campo'),
    nom('', 'presença/ausência máximo/mínimo'),
  ],
  stroop: {
    // Vermelho, Azul, verDe, aMarelo, Laranja, Roxo : le v et le a sont déjà pris.
    keys: { v: 'rouge', a: 'bleu', d: 'vert', m: 'jaune', l: 'orange', r: 'violet' },
    spoken: {
      vermelho: 'rouge',
      vermelha: 'rouge',
      vermelhos: 'rouge',
      vermelhas: 'rouge',
      azul: 'bleu',
      azuis: 'bleu',
      verde: 'vert',
      verdes: 'vert',
      amarelo: 'jaune',
      amarela: 'jaune',
      amarelos: 'jaune',
      amarelas: 'jaune',
      laranja: 'orange',
      laranjas: 'orange',
      roxo: 'violet',
      roxa: 'violet',
      roxos: 'violet',
      roxas: 'violet',
      violeta: 'violet',
      rosa: 'rose',
      rosas: 'rose',
      branco: 'blanc',
      branca: 'blanc',
      brancos: 'blanc',
      brancas: 'blanc',
    },
  },
  grammar,
  demos: {
    anagram: { tiles: ['G', 'T', 'I', 'R', 'E'], order: [1, 2, 0, 3, 4] }, // T I G R E
    mots: { words: ['bicicleta', 'maçã', 'violino'], seen: 'maçã', unseen: 'leão' },
    lettre: { hint: 'Animal da fazenda', word: 'CAVALO', position: 2, letter: 'V', guess: 'B, V ou P…', answer: 'V: CAVALO' },
    categories: ['maçã', 'pera', 'violino', 'cereja'],
    qui: ['Júlia', 'Pedro', 'Nina'],
    lecture: ['Um gato tem quatro patas.', 'O mar é doce.'],
  },
};

export default content;
