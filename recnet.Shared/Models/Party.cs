namespace recnet.Shared.Models;

public class Party
{
    private int Id { get; set; }
    private string? Name { get; set; }
    private List<User>? Users { get; set; }
}
