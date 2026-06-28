import logging
import io
from pathlib import Path
from pydub import AudioSegment

logger = logging.getLogger("mindvox.audio_converter")

def prepare_mp3_for_whisper(file_input: bytes | str | Path, output_path: str | Path) -> Path:
    """
    Pega uma entrada MP3, converte para WAV no padrão estrito do Whisper:
    - 16000 Hz (Sample Rate)
    - 1 Canal (Mono)
    - 16-bit PCM (Exigência do PyTorch/Whisper)
    """
    try:
        output_path = Path(output_path)
        
        # 1. Identifica a entrada e carrega o áudio
        if isinstance(file_input, bytes):
            logger.info(f"Convertendo bytes de MP3 para {output_path.name}...")
            audio = AudioSegment.from_file(io.BytesIO(file_input), format="mp3")
        else:
            input_path = Path(file_input)
            logger.info(f"Convertendo arquivo físico {input_path.name} para {output_path.name}...")
            if not input_path.exists():
                raise FileNotFoundError(f"Arquivo de origem não localizado: {input_path}")
            audio = AudioSegment.from_mp3(str(input_path))

        # 2. Configurações exatas do Whisper
        audio = audio.set_channels(1)      # Força Mono
        audio = audio.set_frame_rate(16000) # Força 16kHz
        audio = audio.set_sample_width(2)   # Força 16-bit (2 bytes por amostra)

        # 3. Garante que o diretório existe
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 4. Exporta forçando o codec pcm_s16le (WAV puro de 16 bits)
        audio.export(
            str(output_path), 
            format="wav", 
            codec="pcm_s16le"
        )
        
        logger.info(f"Conversão concluída com sucesso no formato Whisper: {output_path.name}")
        return output_path

    except Exception as e:
        logger.error(f"Falha crítica na conversão do MP3: {e}")
        raise RuntimeError(f"Não foi possível processar o arquivo MP3: {e}") from e
