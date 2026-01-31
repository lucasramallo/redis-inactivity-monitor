# Redis Inactivity Monitor

![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)
![Node.js](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

> **Proof of Concept (PoC)**: Implementação do padrão *Expired Key Notification* para detecção de inatividade em tempo real.

## Visão Geral

Este projeto demonstra como utilizar o **Redis Keyspace Notifications** para monitorar o tempo de inatividade de usuários em um chat. Em vez de realizar *polling* (consultas constantes) no banco de dados, utilizamos eventos disparados pelo próprio Redis quando uma chave expira.

---

## Funcionamento do Padrão

1.  **Activity Tracking**: Sempre que o usuário envia uma mensagem, uma chave é criada/atualizada no Redis: `active:chat:{user_id}` com um **TTL** (ex: 5 minutos).
2.  **Silent Countdown**: O Redis gerencia a contagem regressiva de forma nativa.
3.  **Event Trigger**: Se o TTL chegar a zero, o Redis publica uma mensagem no canal `__keyevent@0__:expired`.
4.  **Reaction**: O serviço *Listener* captura o ID do usuário e executa a lógica de encerramento de sessão ou alerta.
