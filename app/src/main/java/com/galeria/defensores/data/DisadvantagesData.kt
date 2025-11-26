package com.galeria.defensores.data

import com.galeria.defensores.models.AdvantageItem

object DisadvantagesData {
    val defaultDisadvantages = listOf(
        AdvantageItem(name = "Ambiente Especial", cost = "-1 ponto", description = "O personagem depende de um ambiente específico para viver (ex: água, escuridão, etc.). Fora dele, não recupera PVs e PMs, e só pode fazer um teste de R a cada 1d horas para permanecer ativo."),
        AdvantageItem(name = "Assombrado", cost = "-2 pontos", description = "O personagem é perseguido por um fantasma ou má sorte. Sempre que estiver em combate, deve fazer um teste de R (dificuldade 15). Se falhar, sofre -1 em todas as suas características."),
        AdvantageItem(name = "Bateria", cost = "-1 ponto", description = "O personagem tem uma reserva limitada de energia. Seus PMs são reduzidos (o máximo de PMs é 10 + R). Precisa de 1 hora de recarga para recuperar 1d PMs."),
        AdvantageItem(name = "Código de Honra", cost = "-1 ponto (cada)", description = "O personagem deve seguir regras morais estritas. Se violar o Código, fica Perto da Morte (PVs caem a 0) e perde o direito de usar qualquer poder de Vantagem/Magia até se redimir."),
        AdvantageItem(name = "Deficiência Física: Audição Ruim", cost = "0 pontos", description = "Penalidade de H-1 em testes que envolvam audição."),
        AdvantageItem(name = "Deficiência Física: Surdo", cost = "-1 ponto", description = "Penalidade de H-2 em testes que envolvam audição."),
        AdvantageItem(name = "Deficiência Física: Cego", cost = "-2 pontos", description = "Penalidade de H-2 em combate (exceto com Radar)."),
        AdvantageItem(name = "Deficiência Física: Visão Ruim", cost = "0 pontos", description = "Penalidade de H-1 em testes que envolvam visão."),
        AdvantageItem(name = "Deficiência Física: Mudo", cost = "-1 ponto", description = "Não pode falar, impedindo o uso de magias que exijam palavras (se tiver)."),
        AdvantageItem(name = "Deficiência Física: Sem Faro", cost = "0 pontos", description = "Penalidade de H-1 em testes que envolvam olfato."),
        AdvantageItem(name = "Dependência", cost = "-2 pontos", description = "O personagem precisa consumir algo (ex: sangue, carne, poção) pelo menos uma vez por dia. Caso contrário, perde 1 PV por hora até ser atendido ou morrer."),
        AdvantageItem(name = "Devoção", cost = "-1 ponto", description = "O personagem é dedicado a uma missão/ideia. Se desviar dela, sofre uma penalidade de -1 em todas as Características (F, H, R, A, PdF) até retornar à sua missão."),
        AdvantageItem(name = "Fetiche", cost = "-1 ponto", description = "O personagem precisa de um objeto em mãos para usar magias. Se perdê-lo, dobra o custo em PMs de todas as suas magias."),
        AdvantageItem(name = "Fúria", cost = "-1 ponto", description = "Ao sofrer dano ou ser provocado, deve fazer um teste de R (dificuldade 10) ou entrar em Fúria. Em Fúria, só pode atacar o agressor, sofrendo H-1 em sua Força de Defesa."),
        AdvantageItem(name = "Inculto", cost = "-1 ponto", description = "O personagem é incapaz de ler, escrever ou se comunicar de forma complexa. Sofre H-2 em todos os testes de Perícias que envolvam comunicação ou conhecimento."),
        AdvantageItem(name = "Insano", cost = "0 a -3 pontos", description = "O personagem sofre de um distúrbio mental (Cleptomaníaco, Fobia, Histérico, etc.). A penalidade varia, mas geralmente impõe testes de R para evitar o efeito do distúrbio."),
        AdvantageItem(name = "Interferência", cost = "0 pontos", description = "O personagem prejudica aparelhos eletrônicos próximos (raio de 3m). Sofre H-1 para usar Perícias ou aparelhos tecnológicos."),
        AdvantageItem(name = "Interferência Mágica", cost = "0 pontos", description = "O personagem dificulta magias na área (raio de 3m). Magias lançadas na área dobram o custo em PMs ou sofrem H-1 no ataque."),
        AdvantageItem(name = "Má Fama", cost = "-1 ponto", description = "O personagem é infame. Sofre uma penalidade de -1 em testes de H para interação social."),
        AdvantageItem(name = "Maldição", cost = "-1 ou -2 pontos", description = "O personagem é afetado por um azar ou efeito negativo contínuo (ex: ser transformado em animal)."),
        AdvantageItem(name = "Modelo Especial", cost = "-1 ponto", description = "O corpo do personagem não é humanoide padrão (ex: tem asas, é um robô gigante). Não pode usar equipamentos ou veículos feitos para humanos."),
        AdvantageItem(name = "Monstruoso", cost = "-1 ponto", description = "Aparência repulsiva/aterrorizante. Sofre -1 em testes de H para interação social (exceto Intimidação)."),
        AdvantageItem(name = "Munição Limitada", cost = "-1 ponto", description = "A arma principal de PdF tem munição limitada. Se o dado de PdF for 1, a munição acaba, e você não pode mais usar PdF até recarregar."),
        AdvantageItem(name = "Poder Vergonhoso", cost = "-1 ponto", description = "A magia do personagem exige gestos ou falas constrangedoras. Se não puder fazer, a magia falha."),
        AdvantageItem(name = "Poder Vingativo", cost = "-1 ponto", description = "Sempre que usar qualquer Vantagem ou Magia que custe PMs, deve fazer um teste de R. Se falhar, sofre dano por Força de Ataque (F.A.) igual ao custo em PMs do poder ativado."),
        AdvantageItem(name = "Ponto Fraco", cost = "-1 ponto", description = "Existe uma falha conhecida na técnica do personagem. O oponente pode gastar 1 PM para ter H+1 na Força de Ataque contra você."),
        AdvantageItem(name = "Protegido Indefeso", cost = "-1 ponto (cada)", description = "O personagem deve proteger alguém. Se o protegido estiver em perigo de vida, o personagem sofre H-1 em todos os testes."),
        AdvantageItem(name = "Restrição de Poder", cost = "-1 a -3 pontos", description = "Os poderes do personagem falham ou dobram de custo em PM em uma condição específica (ex: luz do dia, água, sob um tipo de magia)."),
        AdvantageItem(name = "Vulnerabilidade", cost = "Especial", description = "A Armadura (A) do personagem é reduzida a 0 contra um tipo de dano específico (ex: Vulnerabilidade: Fogo, Vulnerabilidade: Magia).")
    )
}
