from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import time
from datetime import datetime
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
import csv

# Use raw string to evitar problemas de sequência de escape
service = Service(r"C:\webdrivers\chromedriver-win64\chromedriver.exe")
browser = webdriver.Chrome(service=service)

# Navegar para o formulário do Google
browser.get("https://docs.google.com/forms/d/e/1FAIpQLSfyd2cprZlkS5TcOTtbq33ed_NhhgM3inlDm2MLfxoSxafWQg/viewform")
time.sleep(10)

Condutor = "Miguel"
Turno = 'GERAL'
Matricula = "OUTRA"
Kilometros= "65"


#Funcionamento#     BOM       REVER

v_Buzina = "BOM"
v_Esguichos_dos_lava_vidros = "BOM"
v_Luzes_minimos = "BOM"
v_Luzes_medios = "BOM"
v_Luzes_maximos = "BOM"
v_Luzes_stop = "BOM"
v_Luzes_marcha_atras = "BOM"
v_Luz_nevoeiro = "BOM"
v_Piscas_FR_TR = "REVER"
v_Rotativos_Ponte = "BOM"
v_Sirene = "BOM"
v_Iluminacao_chapa_matricula = "BOM"
v_Estoboscopios = "BOM"
v_Iluminacao_interior = "BOM"
v_Rádio_de_comunicações = ""
v_Cintos = "BOM"
v_Retrovisores = "BOM"
v_Fechaduras = "BOM"
v_Travoes = "BOM"
v_Projetores_laterais = "BOM"


#Estado#  BOM       REVER

v_Pneus = "BOM"
v_Pressao_pneus = "BOM"
v_Limpeza_exterior = "BOM"
v_Escovas_limpa_vidros = "BOM"
v_Parabrisas = "BOM"

####COMBUSTIVEL#### "   4/4     3/4     2/4     1/4

Deposito = "3/4"


### Motor ###       BOM     CORRIGIDO       REVER

v_Oleo_motor = "BOM"
v_Oleo_direcao_assistida = "BOM"
v_Oleo_travoes = "BOM"
v_Liquido_arrefecimento = "BOM"
v_Liquido_lava_vidros = "BOM"


###  Habitaculo ###     SIM     NÃO

v_Limpeza_interior = "SIM"
v_Triangulo = "SIM"
v_Extintor = "SIM"
v_Pasta_documentos = "SIM"
v_Oculos_protecao = "SIM"
v_Luvas_trabalho = "SIM"
v_Radio_FM = "SIM"
v_Capacetes = "SIM"
v_Colete_sinalizacao = "SIM"
v_Lanterna = "SIM"
v_Carregador_lanterna = "NÃO"
v_Luz_leitura_mapas = "SIM"


### Celula Sanitaria ###    BOM     REVER

v_Bomba_agua = ""
v_Iluminacao_celula = "BOM"
v_Projetor_busca = "BOM"


### Danos ###       1- Risco de 0 a 50 mm	    2- Raspado    3- Mossa + Pintura	        4- Partido	        5- Em Falta

v_Para_Choques = "2- Raspado"
v_Capô = "2- Raspado"
v_Parasol = ""
v_Para_Lamas_Esq = "2- Raspado"
v_Porta_Condutor = ""
v_Painel_Esq = ""
v_Traseira_Esq = "2- Raspado"
v_Para_Lamas_Drt = "2- Raspado"
v_Porta_Passageiro = "2- Raspado"
v_Porta_Lateral = "2- Raspado"
v_Traseira_Drt = "2- Raspado"
v_Para_Choques_Traseiro = "3- Mossa + Pintura"
v_Porta_Traseira_Esq = ""
v_Porta_Traseira_Drt = ""
v_Tejadilho = ""
v_resposta10 = ""






Observações = """HG
Lanterna sem bateria
Pisca frontal direito fundido
"""


Danos_Viatura = """Plástico dos espelhos raspado 
Grelha frontal com falta de tinta
Plástico da luz traseira drt partido
Balizador inferior esq fundido
Porta do Condutor com dificuldade para fechar """


#       pyinstaller HG-Relatorio.py --onefile




### Campos de Texto ##

Motorista = browser.find_element(By.XPATH, value="/html/body/div[1]/div[2]/form/div[2]/div/div[2]/div[1]/div/div/div[2]/div/div[1]/div/div[1]/input")
Motorista.send_keys(Condutor)

Data = browser.find_element(By.XPATH, value="/html/body/div[1]/div[2]/form/div[2]/div/div[2]/div[2]/div/div/div[2]/div/div/div[2]/div[1]/div/div[1]/input")
today = datetime.now().strftime("%d%m%Y")
Data.send_keys(today)




###Turno###

#vai buscar os elementos que tem o role="listbox"
listbox = WebDriverWait(browser, 1).until(
    EC.presence_of_element_located((By.CSS_SELECTOR, f'[role="listbox"]'))
)

#clica para abrir as opções
listbox.click()

#seleciona a opção desejada
option_xpath = f'//div[@role="listbox"]//div[@role="option"]/span[contains(text(), "{Turno}")]'
elemento_para_clicar = WebDriverWait(browser, 1).until(
    EC.element_to_be_clickable((By.XPATH, option_xpath))
)
elemento_para_clicar.click()


time.sleep(0.5) 

###Carro###

Viatura = browser.find_element(By.XPATH, value="/html/body/div[1]/div[2]/form/div[2]/div/div[2]/div[6]/div/div/div[2]/div/div[1]/div[2]")
Viatura.click()
listbox = WebDriverWait(browser, 1).until(
    EC.presence_of_element_located((By.CSS_SELECTOR, f'[role="listbox"]'))
)

#seleciona a opção desejada
option_xpath = f'//div[@role="listbox"]//div[@role="option"]/span[contains(text(), "{Matricula}")]'
elemento_para_clicar = WebDriverWait(browser, 1).until(
    EC.element_to_be_clickable((By.XPATH, option_xpath))
)
elemento_para_clicar.click()

time.sleep(0.5)



###FUNCIONAMENTO##

FUNCIONAMENTO = browser.find_elements(By.XPATH, "/html/body/div[1]/div[2]/form/div[2]/div/div[2]/div[8]/div/div/div[2]/div/div[1]/div/div[2]/span")


Buzina = {"title": "Buzina", "value": v_Buzina}
Esguichos_dos_lava_vidros = {"title": "Esguichos dos lava-vidros", "value": v_Esguichos_dos_lava_vidros}
Luzes_minimos = {"title": "Luzes mínimos", "value": v_Luzes_minimos}
Luzes_medios = {"title": "Luzes médios", "value": v_Luzes_medios}
Luzes_maximos = {"title": "Luzes máximos", "value": v_Luzes_maximos}
Luzes_stop = {"title": "Luzes stop", "value": v_Luzes_stop}
Luzes_marcha_atras = {"title": "Luzes marcha-atrás", "value": v_Luzes_marcha_atras}
Luz_nevoeiro = {"title": "Luz nevoeiro", "value": v_Luz_nevoeiro}
Piscas_FR_TR = {"title": "Piscas FR / TR", "value": v_Piscas_FR_TR}
Rotativos_Ponte = {"title": "Rotativos / Ponte", "value": v_Rotativos_Ponte}
Sirene = {"title": "Sirene", "value": v_Sirene}
Iluminacao_chapa_matricula = {"title": "Iluminação chapa matrícula", "value": v_Iluminacao_chapa_matricula}
Estoboscopios = {"title": "Estoboscópios", "value": v_Estoboscopios}
Iluminacao_interior = {"title": "Iluminação interior", "value": v_Iluminacao_interior}
Rádio_de_comunicações = {"title": "Rádio de comunicações", "value": v_Rádio_de_comunicações}
Cintos = {"title": "Cintos", "value": v_Cintos}
Retrovisores = {"title": "Retrovisores", "value": v_Retrovisores}
Fechaduras = {"title": "Fechaduras", "value": v_Fechaduras}
Travoes = {"title": "Travões", "value": v_Travoes}
Projetores_laterais = {"title": "Projetores laterais", "value": v_Projetores_laterais}

seleccao_funcionamento = [Buzina, Esguichos_dos_lava_vidros, Luzes_minimos, Luzes_medios, Luzes_maximos, Luzes_stop, Luzes_marcha_atras, Luz_nevoeiro, Piscas_FR_TR, Rotativos_Ponte, Sirene, Iluminacao_chapa_matricula, Estoboscopios, Iluminacao_interior, Cintos, Retrovisores, Fechaduras, Travoes, Projetores_laterais]

for seleccao in seleccao_funcionamento:
    time.sleep(0.05)
    title = seleccao["title"]
    value = seleccao["value"]
    radiobutton = browser.find_element(By.XPATH, f'//div[@aria-label="{value}, resposta para {title}"]')
    radiobutton.click()


###ESTADO###
    
Pneus = {"title": "Pneus", "value": v_Pneus}
Pressao_pneus = {"title": "Pressão dos pneus", "value": v_Pressao_pneus}
Limpeza_exterior = {"title": "Limpeza exterior", "value": v_Limpeza_exterior}
Escovas_limpa_vidros = {"title": "Escovas limpa-vidros", "value": v_Escovas_limpa_vidros}
Parabrisas = {"title": "Parabrisas", "value": v_Parabrisas}

seleccao_estado = [Pneus, Pressao_pneus, Limpeza_exterior, Escovas_limpa_vidros, Parabrisas]

for seleccao in seleccao_estado:
    time.sleep(0.05)
    title = seleccao["title"]
    value = seleccao["value"]
    radiobutton = browser.find_element(By.XPATH, f'//div[@aria-label="{value}, resposta para {title}"]')
    radiobutton.click()



####COMBUSTIVEL####

Gasoleo = {"title": "Gasoleo", "value": Deposito}

time.sleep(1)
title = Gasoleo["title"]
value = Gasoleo["value"]
radiobutton = browser.find_element(By.XPATH, f'//div[@aria-label="{value}, resposta para {title}"]')
radiobutton.click()

###DEBAIXO DO CAPO###

Oleo_motor = {"title": "Óleo Motor", "value": v_Oleo_motor}
Oleo_direcao_assistida = {"title": "Óleo direção assistida", "value": v_Oleo_direcao_assistida}
Oleo_travoes = {"title": "Óleo dos travões", "value": v_Oleo_travoes}
Liquido_arrefecimento = {"title": "Líquido de arrefecimento", "value": v_Liquido_arrefecimento}
Liquido_lava_vidros = {"title": "Líquido lava-vidros", "value": v_Liquido_lava_vidros}


seleccao_oleos = [Oleo_motor, Oleo_direcao_assistida, Oleo_travoes, Liquido_arrefecimento, Liquido_lava_vidros]

for seleccao in seleccao_oleos:
    time.sleep(0.05)
    title = seleccao["title"]
    value = seleccao["value"]
    radiobutton = browser.find_element(By.XPATH, f'//div[@aria-label="{value}, resposta para {title}"]')
    radiobutton.click()

###HABITACULO###
    
Limpeza_interior = {"title": "Limpeza Interior", "value": v_Limpeza_interior}
Triangulo = {"title": "Triângulo", "value": v_Triangulo}
Extintor = {"title": "Extintor", "value": v_Extintor}
Pasta_documentos = {"title": "Pasta de Documentos", "value": v_Pasta_documentos}
Oculos_protecao = {"title": "Oculos de proteção", "value": v_Oculos_protecao}
Luvas_trabalho = {"title": "Pares de luvas de trabalho (2 Unidades)", "value": v_Luvas_trabalho}
Radio_FM = {"title": "Radio FM musica", "value": v_Radio_FM}
Capacetes = {"title": "Capacetes", "value": v_Capacetes}
Colete_sinalizacao = {"title": "Colete de Sinalização (2 Undidades)", "value": v_Colete_sinalizacao}
Lanterna = {"title": "Lanterna", "value": v_Lanterna}
Carregador_lanterna = {"title": "Carregador Lanterna", "value": v_Carregador_lanterna}
Luz_leitura_mapas = {"title": "Luz Leitura de Mapas", "value": v_Luz_leitura_mapas}


seleccao_equipamento = [Limpeza_interior, Triangulo, Extintor, Pasta_documentos, Oculos_protecao, Luvas_trabalho, Radio_FM, Capacetes, Colete_sinalizacao, Lanterna, Carregador_lanterna, Luz_leitura_mapas]

for seleccao in seleccao_equipamento:
    time.sleep(0.05)
    title = seleccao["title"]
    value = seleccao["value"]
    radiobutton = browser.find_element(By.XPATH, f'//div[@aria-label="{value}, resposta para {title}"]')
    radiobutton.click()


###CELULA SANITARIA###


#Bomba_agua = {"title": "Bomba de Água", "value": v_Bomba_agua}
Iluminacao_celula = {"title": "Iluminação de Célula", "value": v_Iluminacao_celula}
Projetor_busca = {"title": "Projetor de Busca", "value": v_Projetor_busca}


seleccao_equipamento = [Iluminacao_celula, Projetor_busca]

for seleccao in seleccao_equipamento:
    time.sleep(0.05)
    title = seleccao["title"]
    value = seleccao["value"]
    radiobutton = browser.find_element(By.XPATH, f'//div[@aria-label="{value}, resposta para {title}"]')
    radiobutton.click()


###DANOS NA VIATURA###

Risco= "1- Risco de 0 a 50 mm"
Raspado = "2- Raspado"
Mossa = "3- Mossa + Pintura"
Partido = "4- Partido"
Em_Falta = "5- Em Falta"
Bom = "Bom"

Para_Choques = {"title": "1", "value": v_Para_Choques}
Capô = {"title": "2", "value": v_Capô}
#Parasol = {"title": "14", "value": v_Parasol}
#Para_Lamas_Esq = {"title": "3", "value": v_Para_Lamas_Esq}
Porta_Condutor = {"title": "6", "value": v_Porta_Condutor}
#Painel_Esq = {"title": "8", "value": v_Painel_Esq}
Traseira_Esq = {"title": "11", "value": v_Traseira_Esq}
Para_Lamas_Drt = {"title": "4", "value": v_Para_Lamas_Drt}
Porta_Passageiro = {"title": "7", "value": v_Porta_Passageiro}
Porta_Lateral = {"title": "9", "value": v_Porta_Lateral} 
Traseira_Drt = {"title": "12", "value": v_Traseira_Drt}
Para_Choques_Traseiro = {"title": "13", "value": v_Para_Choques_Traseiro}
#Porta_Traseira_Esq = {"title": "15", "value": v_Porta_Traseira_Esq}
#Porta_Traseira_Drt = {"title": "16", "value": v_Porta_Traseira_Drt}
#Tejadilho = {"title": "5", "value": v_Tejadilho}
#resposta10 = {"title": "10", "value": v_resposta10}

seleccao_riscos = [Capô, Traseira_Esq, Para_Lamas_Drt, Porta_Passageiro, Porta_Lateral, Traseira_Drt, Para_Choques_Traseiro, Para_Choques]

for seleccao in seleccao_riscos:
    time.sleep(0.05)
    title = seleccao["title"]
    value = seleccao["value"]
    radiobutton = browser.find_element(By.XPATH, f'//div[@aria-label="{value}, resposta para {title}"]')
    radiobutton.click()


Obs= browser.find_element(By.XPATH, "/html/body/div[1]/div[2]/form/div[2]/div/div[2]/div[18]/div/div/div[2]/div/div[1]/div[2]/textarea")
Obs.send_keys(Observações)

Danos = browser.find_element(By.XPATH, "/html/body/div[1]/div[2]/form/div[2]/div/div[2]/div[21]/div/div/div[2]/div/div[1]/div[2]/textarea")
Danos.send_keys(Danos_Viatura)

kms = browser.find_element(By.XPATH, "/html/body/div[1]/div[2]/form/div[2]/div/div[2]/div[4]/div/div/div[2]/div/div[1]/div/div[1]/input") 
kms.send_keys(Kilometros)
        
time.sleep(120)

#       pyinstaller HG-Relatorio.py --onefile
