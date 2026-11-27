using System.Text;

namespace ModelAtlas.Api;

// Bounded metadata inspection only; never allocates tensors or tokenizer arrays.
public static class GgufMetadata
{
    public sealed record Header(Dictionary<string, object> Fields, bool Complete);
    public static Header Read(byte[] bytes)
    {
        using var reader = new BinaryReader(new MemoryStream(bytes), Encoding.UTF8);
        var fields = new Dictionary<string, object>();
        string Text()
        {
            var length = reader.ReadUInt64();
            if (length > (ulong)(reader.BaseStream.Length - reader.BaseStream.Position)) throw new EndOfStreamException();
            return Encoding.UTF8.GetString(reader.ReadBytes((int)length));
        }
        object? Value(uint type, bool array = false)
        {
            if (type == 9)
            {
                if (array) throw new InvalidDataException();
                var subtype = reader.ReadUInt32();
                var count = reader.ReadUInt64();
                if (count > (ulong)bytes.Length) throw new InvalidDataException();
                for (ulong i = 0; i < count; i++) Value(subtype, true);
                return null;
            }
            return type switch
            {
                0 => reader.ReadByte(), 1 => reader.ReadSByte(), 2 => reader.ReadUInt16(), 3 => reader.ReadInt16(),
                4 => reader.ReadUInt32(), 5 => reader.ReadInt32(), 6 => reader.ReadSingle(), 7 => reader.ReadBoolean(),
                8 => Text(), 10 => reader.ReadUInt64(), 11 => reader.ReadInt64(), 12 => reader.ReadDouble(),
                _ => throw new InvalidDataException()
            };
        }
        try
        {
            if (reader.ReadUInt32() != 0x46554747 || reader.ReadUInt32() is not (2 or 3)) throw new InvalidDataException();
            reader.ReadUInt64();
            var count = reader.ReadUInt64();
            if (count > 100_000) throw new InvalidDataException();
            for (ulong i = 0; i < count; i++)
            {
                var key = Text();
                var value = Value(reader.ReadUInt32());
                if (value is not null && (key is "general.architecture" or "general.file_type" or "general.quantization_version" or "split.no" or "split.count" ||
                    key.EndsWith(".block_count") || key.EndsWith(".context_length") || key.EndsWith(".embedding_length") ||
                    key.Contains(".attention.head_count") || key.EndsWith(".attention.key_length") || key.EndsWith(".attention.value_length")))
                    fields[key] = value;
            }
            return new(fields, true);
        }
        catch (EndOfStreamException) { return new(fields, false); }
        catch (InvalidDataException) { throw new ProbeFailure("invalid_gguf_metadata"); }
    }
}
