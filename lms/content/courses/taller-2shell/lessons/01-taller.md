---
id: t2s-01
title: "Taller 2Shell · Laboratorio en vivo"
published: true
objectives:
  - id: t2s-01-o1
    title: Saber si un servidor está expuesto a PHP2Shell, Node2Shell o Java4Shell
  - id: t2s-01-o2
    title: Aplicar la mitigación de cada una y comprobar que funcionó
  - id: t2s-01-o3
    title: Reconocer en los registros las señales de un ataque
recording:
  url: ""
  passcode: ""
materials:
  - id: t2s-01-m1
    title: Laboratorio 2Shell (consolas en vivo)
    kind: link
    url: https://jmd-learn.online/lab-2shell/
    objective_ids: [t2s-01-o1, t2s-01-o2, t2s-01-o3]
  - id: t2s-01-m2
    title: CISA · catálogo de vulnerabilidades explotadas (KEV)
    kind: doc
    url: https://www.cisa.gov/known-exploited-vulnerabilities-catalog
    objective_ids: [t2s-01-o1]
cycle:
  - id: ver
    title: Ver el laboratorio
    tool: zoom
    phase: experiencia
    description: Sigue la sesión por Zoom y abre el laboratorio en el LIVE.
    check: Abriste el laboratorio
  - id: comprobar
    title: Comprobar la exposición
    tool: navegador
    phase: experimentacion
    description: Pulsa «Comprobar exposición» en cada módulo y mira la consulta en las consolas.
    check: Comprobaste los tres módulos
  - id: plan
    title: Tu plan de acción
    tool: navegador
    phase: reflexion
    description: Llena el plan para los servidores de tu empresa.
    check: Tienes tu plan de acción
---

Taller defensivo en vivo. El laboratorio corre en un servidor blindado: red interna sin salida a Internet,
solo lectura y acceso solo con tu sesión de JMD Learn. No hay exploits: se practica cómo saber si estás
expuesto, cómo mitigar hoy y cómo detectar un ataque.
