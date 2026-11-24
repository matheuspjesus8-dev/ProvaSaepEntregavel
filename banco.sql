DROP DATABASE IF EXISTS saepvision;
CREATE DATABASE saepvision CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE saepvision;

CREATE TABLE tb_usuario (
  id_usuario     INT AUTO_INCREMENT PRIMARY KEY,
  nome           VARCHAR(100) NOT NULL,
  nome_usuario   VARCHAR(100) NOT NULL UNIQUE,
  email          VARCHAR(150) NOT NULL UNIQUE,
  senha          VARCHAR(255) NOT NULL,
  imagem_usuario VARCHAR(255) NULL,
  tipo           ENUM('usuario','fotografo') NOT NULL DEFAULT 'usuario',
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE tb_publicacao (
  id_publicacao  INT AUTO_INCREMENT PRIMARY KEY,
  titulo_imagem  VARCHAR(150) NOT NULL,
  local_foto     VARCHAR(150) NOT NULL,
  id_usuario     INT NOT NULL,
  url_fotografia VARCHAR(255) NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_publicacao_usuario FOREIGN KEY (id_usuario)
    REFERENCES tb_usuario (id_usuario) ON DELETE CASCADE
);

CREATE TABLE tb_curtida (
  id_curtida     INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario     INT NOT NULL,
  id_publicacao  INT NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_curtida UNIQUE (id_usuario, id_publicacao),
  CONSTRAINT fk_curtida_usuario FOREIGN KEY (id_usuario)
    REFERENCES tb_usuario (id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_curtida_publicacao FOREIGN KEY (id_publicacao)
    REFERENCES tb_publicacao (id_publicacao) ON DELETE CASCADE
);

DELIMITER $$
CREATE TRIGGER trg_publicacao_somente_fotografo
BEFORE INSERT ON tb_publicacao
FOR EACH ROW
BEGIN
  IF (SELECT tipo FROM tb_usuario WHERE id_usuario = NEW.id_usuario) <> 'fotografo' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Somente fotografos podem criar publicacoes';
  END IF;
END$$
DELIMITER ;

INSERT INTO tb_usuario (id_usuario, nome, nome_usuario, email, senha, imagem_usuario, tipo, created_at, updated_at) VALUES
(1,'fotografo1','fotografo_1','fotografo1@email.com','123456','fotografo1.jpg','fotografo','2025-03-25 12:40:08','2025-03-25 12:40:08'),
(2,'fotografo2','fotografo_2','fotografo2@gmail.com','123456','fotografo2.jpg','fotografo','2025-03-25 12:42:56','2025-03-25 12:42:56'),
(3,'fotografo3','fotografo_3','fotografo3@gmail.com','123456','fotografo3.jpg','fotografo','2025-03-25 12:45:44','2025-03-25 12:45:44'),
(4,'usuario1','usuario_1','usuario1@gmail.com','123456','usuario1.jpg','usuario','2025-03-25 12:48:32','2025-03-25 12:48:32'),
(5,'usuario2','usuario_2','usuario2@gmail.com','123456','usuario2.jpg','usuario','2025-03-25 12:51:20','2025-03-25 12:51:20'),
(6,'usuario3','usuario_3','usuario3@gmail.com','123456','usuario3.jpg','usuario','2025-03-25 12:54:08','2025-03-25 12:54:08');

INSERT INTO tb_publicacao (titulo_imagem, local_foto, id_usuario, url_fotografia) VALUES
('Foto 1','Rio de Janeiro',1,'fotografias/foto1.jpg'),
('Foto 2','São Paulo',1,'fotografias/foto2.jpg'),
('Foto 3','Salvador',1,'fotografias/foto3.jpg'),
('Foto 4','Recife',2,'fotografias/foto4.jpg'),
('Foto 5','Florianópolis',2,'fotografias/foto5.jpg'),
('Foto 6','Gramado',2,'fotografias/foto6.jpg'),
('Foto 7','Bonito',3,'fotografias/foto7.jpg'),
('Foto 8','Fernando de Noronha',3,'fotografias/foto8.jpg'),
('Foto 9','Lençóis Maranhenses',3,'fotografias/foto9.jpg');

INSERT INTO tb_curtida (id_usuario, id_publicacao) VALUES
(4,1),(5,1),(6,1),(2,1),
(4,2),(5,2),
(4,4),(6,4),(1,4),
(5,5),
(4,7),(5,7),(6,7),(1,7),(2,7),
(6,9);

SELECT p.id_publicacao, p.titulo_imagem, u.nome AS fotografo, COUNT(c.id_curtida) AS curtidas
FROM tb_publicacao p
JOIN tb_usuario u ON u.id_usuario = p.id_usuario
LEFT JOIN tb_curtida c ON c.id_publicacao = p.id_publicacao
GROUP BY p.id_publicacao, p.titulo_imagem, u.nome;
