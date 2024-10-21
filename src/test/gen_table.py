import pathlib

import pyarrow

table = pyarrow.Table.from_pydict({"a": [1, 2, 3], "b": [4, 5, 6]})

with pyarrow.OSFile(str(pathlib.Path(__file__).parent / "table.arrows"), "wb") as f:
    with pyarrow.ipc.new_stream(sink=f, schema=table.schema) as writer:
        writer.write(table)
